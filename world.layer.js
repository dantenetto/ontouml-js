/**
 *  Módulo camada de mundo
 * 
 *  namespace: world
 * 
 *  Adiciona a capacidade de instanciar/gerenciar objetos dentro 
 *  de um domínio
 * 
 **/

(function (env, undef) {
    "use strict";

    var world;

    env.world = world = {
        _domain: null,
        _kindInstances: null,
        _relatorInstances: null,
        
        init: function (domain) {
            this._domain = Object.create(domain);
            
            this.nextId = 0;

            this._kindInstances = [];
            this._relatorInstances = [];
        },
        
        _consumeId: function () {
            this.nextId += 1;
            
            return this.nextId;
        },
        
        //instancia um kind qualquer dentro do mundo
        instantiate: function (kind, params) {
            var instance;
            
            params || (params = {});
            
            if (typeof kind === 'string') {
                kind = this._domain.kinds[kind];
            }
            
            instance = kind.new(params);
            
            instance._id = params.id || this._consumeId();
            
            this._kindInstances.push(instance);
            
            return instance;
        },

        destroy: function (instance) {
            if (typeof instance === 'string'
            || typeof instance === 'number') {
                instance = this.query({_id: instance});
            }

            if (instance) {
                instance.selfDestruct();
            }
        },
        
        //cria a relação material com os parametros determinados
        relate: function (relatorId, params) {
            var relator; 
            
            if (typeof relatorId === 'string') {
                relatorId = this._domain.relators[relatorId];
            }
            
            params.domain = this._domain;
            
            relator = relatorId.new(params);
            relator._id = this._consumeId();
            
            return relator;
        },

        //parametros: context, context2, ..., callback
        inContextOf: function () {
            var fn, contexts;

            if (arguments.length < 2) throw "The context is required";

            contexts = Array.prototype.pop.slice(arguments);
            
            fn = contexts.pop();

            contexts.forEach(function (relator) {
                relator.enterRelationContext();
            });

            fn.apply(null, contexts);

            contexts.forEach(function (relator) {
                relator.leaveRelationContext();
            });
        },

        query: function (params) {
            var founds = this.queryKinds(params).concat(this.queryRelators(params));

            if (founds.length === 0) return null;
            if (founds.length === 1) return found[0];

            return founds;
        },
        
        //recupera as instancias dos kinds do mundo que encaixam
        //nos parametros de query passados
        queryKinds: function (params) {
            var instances = this._kindInstances,
                found;
            
            found = this._query(instances, params);
            
            return found;
        },
        
        //recupera as instancias dos relators do mundo que encaixam
        //nos parametros de query passados
        queryRelators: function (params) {
            var instances = this._relatorInstances,
                found;
            
            found = this._query(instances, params);
            
            return found;
        },
        
        _query: function (instances, query) {
            var found = [], i, size,
                instance;
            
            for (i = 0, size = instances.length; i < size; i += 1) {
                instance = instances[i];
                
                if (query.isA) {
                    if (this.instanceIsA(instance, query.isA)) {
                        found.push(instance);
                    }
                }

                Object.keys(query, function (key) {
                    if (instance[key] === query[key]) {
                        found.push(instance);
                    }
                });
            }
            
            return found;
        },
        
        //testa a identidade da instancia do objeto dentro do mundo 
        instanceIsA: function (instance, setId) {
            var relators;
            
            if (typeof setId === 'string') {
                setId = this._domain._getById(setId);
            }
            
            if (instance.isA(setId)) return true;
        
            return this._relatorInstances.some(function (relator) {
                var key;

                for (key in relator._relatedParts) {
                    if (relator._relatedParts[key] === instance) {
                        return true;
                    }
                }

                return false;
            });
        }
    }.basedOn(sets.set);
    
}(this));
