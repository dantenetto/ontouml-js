/**
 *  Módulo de eventos
 *
 *  namespace: events
 *
 *  Permite a abstração de eventos e publisher/subscriber
 * 
 *  define 2 protótipos básicos de evento:
 *      baseEvent
 *      actionEvent ........ define um event "preventable"
 *
 *  define o protótipo handler:
 *      wrapper para o callback de um evento
 *
 *  define o protótipo publisher:
 *      canal que gerencia handlers e permite disparar eventos
 *      
 **/

(function (env, undef) {
    "use strict";

    var events,
        lc = {}; //variáveis locais
    
    // [ NAMESPACE ]
    env.events = events = {};


    // [ EVENT ]
    //Evento do tipo mais básico
    events.baseEvent = {
        name: null,
        scope: null,
        sender: null,
        data: null,
        
        //propriedade dinâmica que referencia o handler
        //quando o evento está em execução
        handler: null,

        init: function (params) {
            params = params || {};
            params.name && (this.setEventFullName(params.name));
            this.sender = params.sender;
            this.data = params.data || {};
        },
        
        setEventFullName: function (name) {
            var delimiter = ':',
                nameAndScope;

            name = name || '';

            nameAndScope = name.split(delimiter);
            
            this.name = nameAndScope[0] || null;
            this.scope = nameAndScope[1] || null;
        },

        getEventFullName: function () {
            return this.name + ((this.scope) ? (':' + this.scope) : '');
        },
    };

    //Evento lançado por ações ou objetos em mutação
    //Dependendo dos handlers, pode ser usado para
    //evitar uma possível ação
    events.actionEvent = {
        _prevented: false,
        name: 'actionEvent',
        
        init: function (params) {
            params || (params = {});
            params.name || (params.name = this.name);
            
            this.targetSet = params.targetSet;
            
            this.super(params);
            
        },
        
        preventAction: function () {
            this._prevented = true;
            
            return this;
        },
        
        isPrevented: function () {
            return this._prevented;
        },
    }.basedOn(events.baseEvent);

    //os eventos de mutação tem o resultado da tentativa
    //de realizar a mutação
    events.mutationEvent = {
        STATUS: {
            pending: 0,
            isAlready: 1,
            isNot: 2,
            notAllowed:  3,
            allowed: 4,
        },
        
        name: 'mutationEvent',
        _status: null,      
        targetSet: null,
        
        init: function (params) {
            params || (params = {});
            this._status = this.STATUS.pending;
            
            this.super(params);
        },
        
        success: function () {
            return (this._status === this.STATUS.allowed);
        },
        
        getStatus: function () {
            return this._status;
        },
        
        setStatus: function (status) {
            this._status = status;
        },
        
        preventAction: function () {
            this._status = this.STATUS.notAllowed;
            
            this.callSuper('preventAction');
        },
        
    }.basedOn(events.actionEvent);
    

    // [ HANDLER ]
    //wrapper de função que será executada quando
    //um determinado evento for disparado
    events.handler = {
        active: true,
        callback: null,
        context: null,

        init: function (callback, context) {
            this.callback = callback;
            this.context = context || null;
        },

        activate: function () {
            this.active = true;
        },

        deactivate: function () {
            this.active = false;
        },

        execute: function (event) {
            var target,
                _handler;
            
            if (!this.active) return;
            
            _handler = event.handler;
            event.handler = this;
            
            target = this.context || event.sender;
            this.callback.call(target, event);
            
            event.handler = _handler;
        }
    };


    // [ PUBLISHER ]
    //helper para recuperar o objeto contendo scope e name de um evento
    lc.getEventType = function (eventFullName) {
        var eventType = {};

        events.baseEvent.setEventFullName.call(eventType, eventFullName);

        return eventType;
    };

    //parte local de publisher
    lc.publisher = {
        defaultScope: '__default',

        fireByScope: function (handlers, scope, event) {
            var _default = lc.publisher.defaultScope,
                scopeKey, i, size,
                handlerList;
            
            for (scopeKey in handlers) {
                if (!handlers.hasOwnProperty(scopeKey)) continue;
                if (scope 
                    && (scopeKey !== _default) 
                    && (scopeKey !== scope)) continue;
                                   
                handlerList = handlers[scopeKey];
                size = handlerList.length;
                for (i = 0; i < size; i += 1) {
                    handlerList[i].execute(event);
                }
            }
        },
        
        detachByName: function (handlers, eventName) {
            var eventType = lc.getEventType(eventName);
    
            if (!eventType.name || !handlers[eventType.name]) return;
    
            if (!eventType.scope) {
                handlers[eventType.name] = {};
            } else {
                handlers[eventType.name][eventType.scope] = [];
            }
        },
        
        detachByCallback: function (handlers, callback) {
            var type, scope,
                i, size,
                handlersOfType,
                handlersOfScope;
    
            for (type in handlers) { 
                if (!handlers.hasOwnProperty(type)) continue;
                
                handlersOfType = handlers[type];
                
                for (scope in handlersOfType) { 
                    if (!handlersOfType.hasOwnProperty(scope)) continue;
                    
                    handlersOfScope = handlersOfType[scope];
                    size = handlersOfScope.length;
                    
                    for (i = 0; i < size; i += 1) {
                        if (handlersOfScope.callback !== callback) continue;
                        
                        handlersOfScope.splice(i, 1);

                        break;
                    }
                }
            }
       },
       
       toggleHandlers: function (handlers, activate, scope) {
           var key, i, size;
           
           for (key in handlers) {
               if (!handlers.hasOwnProperty(key)
                || (scope && (key !== scope))) continue;
               
               for (i = 0, size = handlers[key].length; i < size; i += 1) {
                   if (activate) handlers[key][i].activate();
                   else handlers[key][i].deactivate();
               }
           }
       }
    };

    //Publicador para gerenciar handlers e
    //disparar os handlers quando os eventos ocorrerem
    //funciona como um canal de eventos
    events.publisher = {
        handlers: null,

        init: function () {
            this.handlers = {};
        },

        //registra um handler para o event determinado pelo eventName
        //opcionalmente recebe um context que será passado para o handler
        on: function (eventName, callback, context) {
            var eventType = lc.getEventType(eventName),
                handler,
                handlerList,
                name, scope;
            
            if (!callback) return null;
            
            name = eventType.name;
            scope = eventType.scope || lc.publisher.defaultScope;

            if (!this.handlers[name]) {
                this.handlers[name] = {};
            }

            if (!this.handlers[name][scope]) {
                this.handlers[name][scope] = [];
            }

            handlerList = this.handlers[name][scope];
            
            handler = (events.handler.isPrototypeOf(callback)) ? 
                callback
                : events.handler.new(callback, context);
            
            if (handlerList.indexOf(handler) === -1) {
                handlerList.push(handler);
            }

            return handler;
        },

        //dispara o evento determinado pelo eventName
        fire: function (eventName, event, context) {
            var eventType = lc.getEventType(eventName),
                handlerType,
                name, scope;
            
            name = eventType.name;
            scope = eventType.scope;
            
            event || (event = events.baseEvent.new({name: eventName}));
            
            event.firedName = eventType.name;
            event.firedScope = eventType.scope;

            handlerType = this.handlers[eventType.name];
            if (handlerType) {
                lc.publisher.fireByScope(handlerType, scope, event);
            }
            
            delete event.firedName;
            delete event.firedScope;
            
            return this;
        },

        //desregistra apenas um handler quando ele for passado como parâmetros
        //desregistra todos os handlers quando o eventName for passado como parâmetro
        detach: function (param) {
            if ((typeof param) === 'string') {
                lc.publisher.detachByName(this.handlers, param);
            } else {
                lc.publisher.detachByCallback(this.handlers, param);
            }
        },

        //desativa os handlers vinculados a esse tipo de evento
        mute: function (eventName) {
            var eventType = lc.getEventType(eventName);
            
            lc.publisher.toggleHandlers(
                this.handlers[eventType.name],
                false,
                eventType.scope);
                
            
            return this;
        },
        
        //ativa os handlers vinculados a esse tipo de evento
        unmute: function (eventName) {
            var eventType = lc.getEventType(eventName);
            
            lc.publisher.toggleHandlers(
                this.handlers[eventType.name],
                true,
                eventType.scope);
            
            return this;
        },

        //copia os handlers de um publisher para esse
        copyHandlers: function (publisher) {
            var type, scope,
                handlers;

            publisher || (publisher = {});
            handlers = publisher.handlers;
            
            for (type in handlers) {
                if (!handlers.hasOwnProperty(type)) continue;
                
                for (scope in handlers[type]) {
                    if (!handlers[type].hasOwnProperty(scope)) continue;
                    
                    if (this.handlers[type] === undef) {
                        this.handlers[type] = {};
                    }

                    if (this.handlers[type][scope] === undef) {
                        this.handlers[type][scope] = [];
                    }

                    this.handlers[type][scope] =  
                        this.handlers[type][scope]
                            .concat(handlers[type][scope]);
                }
            }
        },
        
        //remove handlers iguais (possivelmente copiados)
        removeSameHandlers: function (publisher) {
            var type, scope,
                handlers;

            publisher || (publisher = {});
            handlers = publisher.handlers;
            
            for (type in handlers) {
                if (!handlers.hasOwnProperty(type)) continue;
                
                for (scope in handlers[type]) {
                    if (!handlers[type].hasOwnProperty(scope)) continue;
                    
                    this.detach(handlers[type][scope]);
                }
            }
        }
    };

}(this));
