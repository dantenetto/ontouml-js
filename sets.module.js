/**
 *  Módulo de conjuntos
 * 
 *  namespace: sets
 * 
 *  Cria a abstração de um "set" como definido no capítulo 4.
 * 
 *  interface de um set:
 *      become
 *      degenerate
 *      isA
 *      respondsAs
 * 
 *  eventos gerados por um set:
 *      beforeInstantiate
 *      afterInstantiate
 *
 *      beforeSelfDestruct
 *      afterSelfDestruct
 * 
 *      beforeBecome:base
 *      beforeBecome:target
 *      afterBecome:base
 *      afterBecome:target
 * 
 *      beforeDegenerate:base
 *      beforeDegenerate:target
 *      afterDegenerate:base
 *      afterDegenerate:target
 * 
 **/

(function (env, undef) {
    "use strict";
    
    var sets, ev,
        lc = {};

    ev = events;
    env.sets = sets = {};


    //dispara o evento para todos os publishers na cadeia de protótipos
    lc.firePublishersInChain = function (object, eventName, event) {
        var actualPrototype;

        for (actualPrototype = object;
             Object.getPrototypeOf(actualPrototype) !== null;
             actualPrototype = Object.getPrototypeOf(actualPrototype)) {
            
            if (!actualPrototype.hasOwnProperty('publisher')
                || !actualPrototype.publisher) continue;

            actualPrototype.publisher.fire(eventName, event);
        }
    };

    
    sets.set = {
        //mantem referência para todos os sets que a instância é
        _setsIn: null,
        
        publisher: null,
        
        new: function () {
            var object, event;
            
            if (this._beforeInstantiate
                    .apply(this, arguments)
                    .isPrevented()) {
                return null;
            }
            
            object = Object.prototype.new.apply(this, arguments);

            event = this._afterInstantiate(object, arguments);

            return event.data.instance || object;
        },
        
        init: function () {
            
            if (!this.hasOwnProperty('publisher')) {
                this.publisher = ev.publisher.new();
            }
            
            if (!this.hasOwnProperty('_setsIn')) {
                this._setsIn = [];
            }
        },

        //inutiliza a instância como se ela fosse destruída do sistema
        selfDestruct: function () {
            var key, event;

            if (this._beforeSelfDestruct
                    .apply(this, arguments)
                    .isPrevented()) {
                return null;
            }

            event = this._afterSelfDestruct
                    .apply(this, arguments);

            //tem que acontecer depois do after ser executado para ainda
            //ter acesso ao publisher
            for (key in this) {
                this[key] = undefined;
            }
            this._isDestroyed = true;
            
            return event;
        },

        canSelfDestroy: function () {
            return this._beforeSelfDestruct.apply(this, arguments).success();
        },
        
        //pergunta se a instância é uma "instância" do set passado
        isA: function (set) {
            var i, size;
            
            if (set.isPrototypeOf(this)
                || set === this) return true;
            
            for (i = 0, size = this._setsIn.length; i < size; i += 1) {
                if (this._setsIn[i].isA(set)) return true;
            }
            
            return false;
        },
        
        //pergunta se a interface (métodos) dos objetos é a mesma
        respondsAs: function (object) {
            var key;
            
            for (key in object) {
                if (typeof object[key] !== 'function') continue;
                
                if (typeof this[key] !== 'function') return false;
            }
            
            return true;
        },
        
        //torna a instancia uma instancia do set passado, adicionando
        //novos comportamentos e estados do set
        // objeto params pode controlar o evento de become
        //      init - dados a serem passados para o init do set
        //      silence - não dispara os eventos beforeBecome e afterBecome. (default false)
        //      skipInitialization - não executa o init do set. (default false)
        //      noPropagation - se deve verificar todas as regras possíveis ou
        //                      apenas desse contexto (default false)
        become: function (set, params) {
            var event, initArguments;

            if (!set.isA(sets.set)) throw new Error("Can't become a non set instance.");
            
            params || (params = {});
            
            //evita disparar o handlers de beforeBecome e ignora as regras
            if (!params.silence) {
                event = set._beforeBecome
                           .apply(this, arguments);
                       
                if (!event.success()) return event;
            }
            
            this.augment(set, true, false, sets.set);
            
            //os parâmetros de inicialização podem ser passados em params
            //ao invocar o become, ou podem ser setados dentro dos
            //dados do evento de beforeBecome por algum handler
            initArguments = params.init || (event && event.data.init);
            
            if (!Array.prototype.isPrototypeOf(initArguments)) {
                initArguments = [initArguments];
            }
            
            if (!params.skipInitialization) {
                set.init.apply(this, initArguments);
            }

            this._addSetsIn(set);
            
            //evita disparar os handlers de afterBecome
            if (params.silence) return;
            
            return this._afterBecome(event, params);
        },
        
        //checa se uma instancia pode se tornar um set
        canBecome: function () {
            return this._beforeBecome.apply(this, arguments).success();
        },
        
        //retira da instancia os comportamentos e estados do set passado
        // objeto params
        //      silence - não dispara os eventos beforeDegenerate e afterDegenerate. (default false)
        degenerate: function (set, params) {
            var publisher, _setsIn, events;

            if (!set.isA(sets.set)) throw new Error("Can't degenerate a non set instance.");

            params = (params || {});

            //evita disparar o handlers de beforeDegenerate e ignora as regras
            if (!params.silence) {
                event = this._beforeDegenerate
                           .apply(this, arguments);
                           
                if (!event.success()) return event;
            }

            publisher = this.publisher;
            _setsIn = this._setsIn;

            this.diminish(set, true);
            
            this.publisher = publisher;
            this._setsIn = _setsIn;
            
            this._removeSetsIn(set);
            
            //evita disparar os handlers de afterDegenerate
            if (params.silence) return;
            
            return this._afterDegenerate(event, params);
        },
        
        //checa se uma instancia pode deixar de se tornar um set
        canDegenerate: function () {
            return this._beforeDegenerate.apply(this, arguments).success();
        },

        //registra um handler para um evento
        on: function (eventName, fn, context) {
            var pub = this.publisher;
            
            if (!pub) return this;

            //registra o mesmo handler para vários eventos
            if (Array.prototype.isPrototypeOf(eventName)) {
                eventName.forEach(function (eventName) {
                   pub.on(eventName, fn, context); 
                });
            } else { 
                pub.on(eventName, fn, context);
            }

            return this;
        },

        //dispara um evento
        fire: function (eventName, event, noPropagation) {
            var setIn,
                i, size;

            if (event) {
                event.targetSet || (event.targetSet === this);
                event.setEventFullName(eventName);
            } else {
                event = ev.baseEvent.new({
                    name: eventName,
                    sender: this
                });
            }

            lc.firePublishersInChain(this, eventName, event);
            
            if (!noPropagation) {
                for (i = 0, size = this._setsIn.length; i < size; i += 1) {
                    setIn = this._setsIn[i];
                    lc.firePublishersInChain(setIn, eventName, event);
                }
            }

            return this;
        },

        _beforeInstantiate: function (data) {
            var event;

            data || (data = {});
            event = ev.actionEvent.new({
                sender: this,
                data: data
            });

            this.fire('beforeInstantiate', event, data.noPropagation);

            return event;
        },

        _afterInstantiate: function (object, data) {
            var event;

            data || (data = {});
            event = ev.baseEvent.new({
                sender: this,
                data: {
                    instance: object,
                    params: data
                }
            });

            this.fire('afterInstantiate', event, data.noPropagation);

            return event;
        },

        _beforeSelfDestruct: function (data) {
            var event;

            data || (data = {});
            event = ev.actionEvent.new({
                sender: this,
                data: data
            });

            this.fire('beforeSelfDestruct', event, data.noPropagation);

            return event;
        },

        _afterSelfDestruct: function (data) {
            var event;

            data || (data = {});
            event = ev.baseEvent.new({
                sender: this,
                data: data
            });

            this.fire('afterSelfDestruct', event, data.noPropagation);

            return event;
        },
        
        _beforeBecome: function (set, data) {
            var data, event;

            data || (data = {});
            event = ev.mutationEvent.new({
                sender: this,
                targetSet: set,
                data: data
            });

            if (this.isA(set)) {
                event.setStatus(event.STATUS.isAlready);
                return event;
            }

            //escopo ':base' significa que esse set é a instancia (base)
            //e está tentando se tornar um outro set (targetSet)
            //base -> sofrerá a mutação
            this.fire('beforeBecome:base', event, data.noPropagation);
            
            if (event.isPrevented()) return event;
                       
            //escopo ':target' significa que esse set é o alvo e o sender
            //se tornará esse set
            //target -> será incorporado pelo sender
            set.fire('beforeBecome:target', event, data.noPropagation);

            if (!event.isPrevented()) {
                event.setStatus(event.STATUS.allowed);
            }

            return event;
        },

        _afterBecome: function (event, data) {
            data || (data = {});
            this.fire('afterBecome:base', event, data.noPropagation);
            
            event.targetSet.fire('afterBecome:target', event, data.noPropagation);
            
            return event;
        },
        
        _beforeDegenerate: function (set, data) {
            var event;

            data || (data = {});
            event = ev.mutationEvent.new({
                    sender: this,
                    targetSet: set,
                    data: data
                });

            if (!this.isA(set)) {
                event.setStatus(event.STATUS.isNot);
                return event;
            }

            //escopo ':base' significa que esse set é a instancia (base)
            //e está tentando abandonar o set (targetSet)
            //base -> sofrerá a mutação
            this.fire('beforeDegenerate:base', event, data.noPropagation);
            
            if (event.isPrevented()) return event;
                       
            //escopo ':target' significa que esse set é o alvo e o sender
            //abandonará
            //target -> será decrescido pelo sender
            set.fire('beforeDegenerate:target', event, data.noPropagation);

            if (!event.isPrevented()) {
                event.setStatus(event.STATUS.allowed);
            }

            return event;
        },

        _afterDegenerate: function (event, data) {
            data || (data = {});
            
            this.fire('afterDegenerate:base', event, data.noPropagation);
           
            event.targetSet.fire('afterDegenerate:target', event, data.noPropagation);
            
            return event;
        },
        
        _addSetsIn: function (set) {
            this._setsIn.push(set);
        },
        
        _removeSetsIn: function (set) {
            var index;
                
            index = this._setsIn.indexOf(set);
            
            if (index === -1) return;

            this._setsIn.splice(index, 1);
        },
    };

}(this));
