/**
 *  Módulo da camada de domínio
 * 
 *  namespace: domain
 * 
 *  Representa a um modelo ontouml
 * 
 **/

(function (env, undef) {
    "use strict";

    var domain,
        onto = env.onto;

    env.domain = domain = {
        kinds: null,
        roles: null,
        phases: null,
        relators: null,
        
        init: function (ontoDefinition) {
            this.super();
            
            this.kinds = {};
            this.roles = {};
            this.phases = {};
            this.relators = {};
            
            if (ontoDefinition) {
                this._buildOnto(ontoDefinition);
            };
        },
        
        _buildOnto: function (definition) {
            var key, id,
                methodName,
                params,
                models;

            for (key in definition) {
                if (!definition.hasOwnProperty(key)) continue;
                
                methodName = 'add' + key[0].toUpperCase() + key.slice(1, -1);
                
                models = definition[key];
                
                for (id in models) {
                    if (!models.hasOwnProperty(id)) continue;
                    
                    params = models[id];
                    params.id = id;
                    
                    this[methodName](params);
                }
            }
        },
        
        _buildSet: function (params, preventIfNotDirectRule) {
            var set, key, fn;
            
            set = params.set;
            
            if (typeof params.base === 'string') {
                params.base = this._getById(params.base);
            }
            
            if (!params.base) throw "id:" + params.base + " passed to base type:" + params.id + " is not a type";
            
            set = set.basedOn(params.base);
            
            if (params.rules) {
                for (key in params.rules) {
                    if (!params.rules.hasOwnProperty(key)) continue;

                    set.on(key, params.rules[key]);
                }
            }
            
            return set;
        },
        
        addKind: function (params) {
            var kind;

            params.base || (params.base = onto.kind);
            kind = this._buildSet(params);
            
            this.kinds[params.id] = kind;
            
            return kind;
        },
        
        addPhase: function (params) {
            var phase, key;

            if (typeof params.specializationOf === 'string') {
                params.specializationOf = this._getById(params.specializationOf);
            }

            if (params.specializationOf
            && params.specializationOf.isA(onto.phase)) {
                params.base = params.specializationOf;
                params.specializationOf = null;
            }
            
            params.base || (params.base = onto.phase);
            phase = this._buildSet(params);

            params.specializationOf && phase.specialize(params.specializationOf);
            
            this.phases[params.id] = phase;
            
            return phase;
        },
        
        addRole: function (params) {
            var role;

            params.base || (params.base = onto.role);
            role = this._buildSet(params);
            
            if (typeof params.specializationOf === 'string') {
                params.specializationOf = this._getById(params.specializationOf);
            }

            if (params.specializationOf.isA(onto.role)) {
                role = role.basedOn(params.specializationOf);
            } else {
                role.specialize(params.specializationOf);
            }
            
            this.roles[params.id] = role;
            
            return role;
        },
        
        addRelator: function (params) {
            var relator,
                i, size, key;

            params.base || (params.base = onto.relator);
            relator = this._buildSet(params);
            
            relator._roleSets = {};
            
            for (i = 0, size = params.roles.length; i < size; i += 1) {
                key = params.roles[i];
                
                relator._roleSets[key] = this.roles[key];
            }
            
            this.relators[params.id] = relator;
            
            return relator;
        },
        
        _arrayOfTypes: function () {
            return [
                this.kinds, 
                this.roles, 
                this.phases, 
                this.relators
            ];
        },
        
        _getById: function (id) {
            var key, size, i, types, type;
            
            types = this._arrayOfTypes();
            
            for (i = 0, size = types.length; i < size; i += 1) {
                type = types[i];
                
                for (key in type) {
                    if (!type.hasOwnProperty(key)) continue;
                    
                    if (key === id) {
                        return type[key];
                    }
                }
            }
            
            return null;
        },
        
        queryTypes: function (set) {
            var types = this._arrayOfTypes(),
                key, i, size, type,
                foundTypes = [];
            
            for (i = 0, size = types.length; i < size; i += 1) {
                type = types[i];
                
                for (key in type) {
                    if (!type.hasOwnProperty(key)) continue;
                    
                    if (type[key] !== set 
                        && type[key].isA(set)) {
                        foundTypes.push(type[key]);
                    }
                }
            }
            
            return foundTypes;
        },
    }.basedOn(sets.set);
    
}(this));
