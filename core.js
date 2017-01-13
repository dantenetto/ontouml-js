/**
 *  Módulo core
 * 
 *  namespace: -
 * 
 *  Acrescenta no prototype base de objetos
 *  métodos para auxiliar nas heranças prototipadas
 *  e permitir uma criação de objeto mais declarativa. (object literal)
 *
 *  Este arquivo define "palavras reservadas" dentro de um objeto, que são:
 *      new
 *      basedOn
 *      basedOnInited
 *      augment
 *      diminish
 *      init
 *      super
 *      callSuper
 *      
 *  Obs.: essas palavras deveriam ter algum prefixo como "__" para
 *        evitar colisão com nomes do usuário porém, 
 *        para o ambiente desse projeto, decidi evitar
 *        o namespace para aumentar a legibilidade do código
 **/

(function (env, undef) {
    "use strict";
    
    var reservedWords = ['new', 'basedOn', 'basedOnInited',
        'augment', 'diminish', 'super', 'callSuper'],
        
        objectMethods = {};

    //acessa a função init do prototype e a invoca no contexto
    //do objeto
    function __createSuperMethods(newObject) {
        var prototype, superFn;

        prototype = Object.getPrototypeOf(newObject);

        //invoca um método do pai
        superFn = function (methodName, params) {
            var _callSuper = this.callSuper,
                returnedValue;
            
            if (typeof prototype[methodName] !== 'function') {
                throw 'There isn\'t a "' + methodName + '" on the prototype chain.';
            }
            
            if (!prototype.hasOwnProperty(methodName)
                || (prototype[methodName] === this[methodName])) {      
                return prototype.callSuper.apply(this, arguments);
            }
            
            this.callSuper = prototype.callSuper;
            
            returnedValue = prototype[methodName].apply(this, 
                                Array.prototype.slice.call(arguments, 1));
                
            this.callSuper = _callSuper;
                        
            return returnedValue;
        };
        
        Object.defineProperty(newObject, 'callSuper', {
            configurable: false,
            enumerable: false,
            writable: true,
            value: superFn
        });
    }
    
    //para garantir que todos os objetos terão um init padrão
    objectMethods.init = function () {};
    
    //syntactic sugar para invocar o init do pai (como existe em java)
    objectMethods.super = function () {
        return this.callSuper.apply(this, 
            ['init'].concat(Array.prototype.slice.call(arguments)));
    };

    //permite instanciar um novo objeto usando como prototype
    //o objeto atual. Invoca o método init para possibilitar 
    //customizar a inicialização
    //Da mesma forma que um objeto class em ruby possui o .new
    //para instanciar um objeto usando aquela class como "prototype"
    objectMethods.new = function () {
        var newObject;

        newObject = Object.create(this);
        
        __createSuperMethods(this);
        
        this.init.apply(newObject, arguments);

        return newObject;
    };

    //usada para realizar a herança entre objetos.
    //vantagem de poder ser invocada ao final de um
    //objeto literal
    objectMethods.prototypedBy = function (prototype) {
        var newObject = Object.create(prototype);
        
        newObject.augment(this, true);
        
        __createSuperMethods(newObject);        
        
        return newObject;
    };
    
    //herança que inicializa o protótipo pai antes de usá-lo
    //como base do novo objeto
    objectMethods.basedOn = function (prototype) {
        var newObject = Object.prototype
                              .new
                              .apply(prototype, 
                                     Array.prototype.slice.call(arguments, 1));
        
        newObject.augment(this, true);

        __createSuperMethods(newObject);
        
        return newObject;
    };
    
    //aumenta o objeto com as propriedades de outro objeto
    //  augmenter ........ objeto de onde serão copiados as propriedades
    //  deep ............. se true, a cópia será por toda a cadeia de protótipo (default: false)
    //  overwrite ........ se true, sobreescreve as propriedades já existentes no objeto (default: false)
    //  untilPrototype ... se passado, quando deep é true, pára a cópia antes de atingir esse protótipo
    objectMethods.augment = function (augmenter, deep, overwrite, untilPrototype) {
        var actualPrototype, self;

        self = this;
        deep = !!deep;
        overwrite = !!overwrite;
        untilPrototype = untilPrototype || Object.prototype;

        //varre a cadeia de prototypes caso seja deep
        for (actualPrototype = augmenter;
             actualPrototype !== untilPrototype;
             actualPrototype = Object.getPrototypeOf(actualPrototype)) {
                 
            Object.keys(actualPrototype).forEach(function (key) {
                var descriptor;
                
                if ((reservedWords.indexOf(key) !== -1) ||
                    (!overwrite && self.hasOwnProperty(key))) return;
                
                descriptor = Object
                    .getOwnPropertyDescriptor(actualPrototype, key);
                descriptor.configurable = true;
                    
                Object.defineProperty(self, key, descriptor);
            });
            
            if (!deep) break;
         }
    };

    //reduz o objeto retirando todas as propriedades que existem em comum
    //no objeto diminisher
    //  deep .... retira todos as propriedades existentes em toda a cadeia de diminisher
    objectMethods.diminish = function (diminisher, deep) {
        var actualPrototype, 
            self;
            
        self = this;
        deep = !!deep;

        for (actualPrototype = diminisher;
             Object.getPrototypeOf(actualPrototype) !== null;
             actualPrototype = Object.getPrototypeOf(actualPrototype)) {
            
            Object.keys(actualPrototype).forEach(function (key) {
                if (!self.hasOwnProperty(key)) return;
                
                //se for método, só apaga quando for igual
                if ((reservedWords.indexOf(key) !== -1) ||
                    ((typeof self[key] === 'function')
                    && (self[key] !== actualPrototype[key]))) return;

                //remove a propriedade desse objeto
                delete self[key];
            });

            if (!deep) break;
         }
    };
    
    //definindo as propriedades no protótipo de Object
    Object.defineProperties(Object.prototype, {
        init: {
            configurable: false,
            enumerable: false,
            writable: false,
            value: objectMethods.init,
        },
        
        super: {
            configurable: false,
            enumerable: false,
            writable: false,
            value: objectMethods.super,
        },
        
        new: {
            configurable: false,
            enumerable: false,
            writable: false,
            value: objectMethods.new,
        },

        prototypedBy: {
            enumerable: false,
            writable: false,
            configurable: false,
            value: objectMethods.prototypedBy,
        },
        
        basedOn: {
            configurable: false,
            enumerable: false,
            writable: false,
            value: objectMethods.basedOn,
        },
        
        augment: {
            configurable: false,
            enumerable: false,
            writable: false,
            value: objectMethods.augment,
        },
        
        diminish: {
            configurable: false,
            enumerable: false,
            writable: false,
            value: objectMethods.diminish,
        },
    });

}(this));
