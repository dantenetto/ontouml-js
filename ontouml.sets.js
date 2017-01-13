/**
 *  Módulo dos estereótipos ontouml
 * 
 *  namespace: onto
 * 
 *  Define regras bases do estereótipos ontouml
 * 
 **/
  
(function (env, undef) {
    var onto,
        ev,
        st;
    
    ev = env.events;
    st = env.sets;
    
    env.onto = onto = {};
    
    function preventHandler(e) {
        e.preventAction();
    }
    
    //todas as capacidades comuns a todos os universals devem estar aqui
    onto.universal = {
        usingContext: function (context, params) {
            var self = this;
            
            this.inContext(context, params);

            return {
                do: function (fn) {
                    
                    fn(context, params);
                    
                    self.leaveContext(context, params);
                    
                    return self;
                }
            };
        },

        inContext: function (context, params) {
            var event = ev.baseEvent.new({
                sender: this,
                name: 'enterContext',
                data: {
                    context: context,
                    params: params
                }
            });

            context.fire('enterContext', event);            
            
            return this;
        },
        
        leaveContext: function (context, params) {
            var event = ev.baseEvent.new({
                sender: this,
                name: 'leaveContext',
                data: {
                    context: context,
                    params: params
                }
            });

            context.fire('leaveContext', event);
            
            return this;
        }
    }.basedOn(st.set);
    
    //um tipo rígido nunca pode ser "acrescentado" a outro indivíduo
    //nem pode ser abandonado
    onto.rigidSortal = {
    }.basedOn(onto.universal)
     .on('beforeBecome:target', preventHandler)
     .on('beforeDegenerate:target', preventHandler);

    onto.kind = {
    }.basedOn(onto.rigidSortal);


    //os anti-rígidos (roles, phases) devem ser aplicados a algum tipo
    //e se limitam a serem aplicados a somente esse tipo
    onto.antiRigidSortal = {
        _specializationOf: null,
        
        specialize: function (set) {
            this._specializationOf = set;

            return this;
        }
    }.basedOn(onto.universal)
     //garante que apenas instâncias do set especializado possa
     //instanciar dinamicamente o tipo anti-rigido
     .on('beforeBecome:target', function (e) {
        var set,
            instance = e.sender;

        for (set = e.targetSet; set && (set !== sets.set); set = Object.getPrototypeOf(set)) {
            if (set._specializationOf
            && !instance.isA(set._specializationOf)) return e.preventAction();
        }
     });
     
     
    //phaseGroupId serve para agrupar phases sob {disjoint, complete}
    //não permitindo que uma instancia se torne uma fase sem abandonar
    //outra fase já no mesmo phaseGroup
    onto.phase = {
        phaseGroupId: null,

        specialize: function (set) {
            this.callSuper('specialize', set);

            //if (set.isA(onto.antiRigidSortal)) {
            //    set.on('afterBecome:target', this._initPhaseHandler, this);
            //} else {
                set.on('afterInstantiate', this._initPhaseHandler, this);
            //}
            set.on('changeState', this._initPhaseHandler, this);
            
            return this;
        },
        
        _initPhaseHandler: function (e) {
            var instance = e.data.instance || e.sender;
            
            instance.become(this);
        },

        canChangeTo: function (phase) {
            var phaseGroupId,
                phaseIn;

            phaseGroupId = phase.phaseGroupId;
            
            phaseIn = this._queryPhaseSet(phaseGroupId);
            
            if (!this.canDegenerate(phaseIn, data) 
                || !this.canBecome(phase, data)) {
                return false;
            }
        },

        transitTo: function (phase, params) {
            var phaseIn, i, size,
                phaseGroupId, event,
                data, event;
                
            phaseGroupId = phase.phaseGroupId;
            
            phaseIn = this._queryPhaseSet(phaseGroupId);
            
            if (!phaseIn) return false;
            
            data = {
                currentPhase: phaseIn,
                targetPhase: phase
            }.augment(params);
            
            
            if (!this.canDegenerate(phaseIn, data) 
                || !this.canBecome(phase, data)) {
                return false;
            }
            
            event = this.degenerate(phaseIn, data);
            
            return event;
        },
        
        //obtem o phase set a partir do phaseGroupId
        _queryPhaseSet: function (phaseGroupId) {
            var i, size;
            
            for (i = 0, size = this._setsIn.length; i < size; i += 1) {
                if (this._setsIn[i].phaseGroupId === phaseGroupId) {
                    return this._setsIn[i];
                }
            }
            
            return null;
        },
    }.basedOn(onto.antiRigidSortal)
     .on('beforeBecome:target', function (e) {
         if (!e.targetSet.isA(onto.phase)) return;
         if (e.targetSet.phaseGroupId === null) throw "Missing phaseGroupId in phase set";
         
         if (e.isPrevented() || !e.sender.transitTo) return;         
         
         //desativa esse handler para evitar loop ao verificar
         //regras de transição
         e.handler.deactivate();
         
         e.sender.transitTo(e.targetSet, e.data);
         
         //reativa o handler
         e.handler.activate();
     });
     
     
     onto.role = {
     }.basedOn(onto.antiRigidSortal);
    
    
    onto.relator = {
        relatorPropertyId: null,
        _roleSets: {},
        _relatedParts: null,
        
        init: function (params) {
            var key, role, part, parts;

            this.super();
            
            if (params && !this.relatorPropertyId) {
                throw "The relator must explicitly name his property on the relatedParts";
            }
            
            this._relatedParts = {};
            
            for (key in this._roleSets) {
                if (!this._roleSets.hasOwnProperty(key)) continue;
                
                role = this._roleSets[key];
                
                if (!params.hasOwnProperty(key)) {
                    throw "Missing relation '" + key + "'.";
                }

                //relaçao para N
                if (Array.prototype.isPrototypeOf(params[key])) {
                    part = [];
                    parts = params[key];
                    for (i = 0, size = parts.length; i < size; i += 1) {
                        part.push(this._createRoleObject(parts[i], role)); 
                        if (!parts[i].isA(role) 
                        && !parts[i].canBecome(role, {noPropagation: true})) {
                            throw "Can't become role '" + key + "'.";
                        }
                        this._attachDestroyRelation(parts[i], role);
                    }
                //relação para 1
                } else {
                    part = this._createRoleObject(params[key], role); 
                    if (!params[key].isA(role) 
                    && !params[key].canBecome(role, {noPropagation: true})) {
                        throw "Can't become role '" + key + "'.";
                    }

                    this._attachDestroyRelation(params[key], role);
                }
                
                this._relatedParts[key] = part;
            }
        },
        
        _createRoleObject: function (object, role, params) {
            return {
                part: object,
                role: role.new(params)
            };
        },

        _attachDestroyRelation: function (part, role) {
            part.on('afterSelfDestruct', this._destroyRelation, this);
            part.on('afterDegenerate:base', function (e) {
                if (e.targetSet === role._specializationOf) {
                    this._detroyRelation();
                }
            }, this);
        },
                
        _destroyRelation: function () {
            this.leaveRelationContext();

            this.selfDestruct();
        },
        
        addRelationPart: function (referenceName, part, params) {
            var part, isArray;
            
            isArray = (Array.prototype.isPrototypeOf(this._relatedParts[referenceName]));
            
            if (this._relatedParts[referenceName] && !isArray) {
                throw "The part " + referenceName + " is already defined";
            }
            
            part = this._createRoleObject(part, 
                                          this._roleSets[referenceName], 
                                          params);

            if (isArray) {
                this._relatedParts[referenceName].push(part);
            } else {
                this._relatedParts[referenceName] = part;
            }
            
        },
        
        enterRelationContext: function () {
            var key, roleObject;
            
            for (key in this._relatedParts) {
                if (!this._relatedParts.hasOwnProperty(key)) continue;
                
                roleObject = this._relatedParts[key];
                
                if (Array.prototype.isPrototypeOf(roleObject)) {
                    for (i = 0, size = roleObject.length; i < size; i += 1) {
                        roleObject[i].part.become(roleObject[i].role, {
                            skipInitialization: true,
                            noPropagation: true
                        });
                        roleObject[i].part[this.relatorPropertyId] = this;
                    }
                } else {
                    roleObject.part.become(roleObject.role, {
                        skipInitialization: true,
                        noPropagation: true
                    });
                    roleObject.part[this.relatorPropertyId] = this;
                }
            }
        },
        
        leaveRelationContext: function () {
            var key, roleObject;
            
            for (key in this._relatedParts) {
                if (!this._relatedParts.hasOwnProperty(key)) continue;
                
                roleObject = this._relatedParts[key];
                
                if (Array.prototype.isPrototypeOf(roleObject)) {
                    for (i = 0, size = roleObject.length; i < size; i += 1) {
                        roleObject[i].part.degenerate(roleObject[i].role, {noPropagation: true});
                        delete roleObject[i].part[this.relatorPropertyId];
                    }
                } else {
                    roleObject.part.degenerate(roleObject.role, {noPropagation: true});
                    delete roleObject.part[this.relatorPropertyId];
                }
            }
        },
        
        underThisRelation: function (fn) {
            this.enterRelationContext();
            
            fn(this._relatedParts, this);
            
            this.leaveRelationContext();
        }
    }.basedOn(onto.universal);
    
}(this));
