
/**
 *                                                  NE STATE
 * ***************************************************************************************************************************
 */

angular.module('neState', ['ngCookies'])
.factory('NeStateService',['$timeout','$location','$rootScope','$cookies', function($timeout, $location, $rootScope, $cookies){

	
    function encryptString(str){
        return window.btoa(str);
    }
    
    function decryptString(str){
        return window.atob(str);
    }
    
    var locationStore = {
        encrypt: false,
        prefix: 'q',
        parser: function (locationString){
            var locationPrefix = this.prefix;
            var encryptLocation = this.encrypt;
            locationString = decodeURIComponent( locationString || $location.search()[ locationPrefix ] );

            try {
                if(encryptLocation) locationString = decryptString(locationString);
                return angular.fromJson(locationString || '{}') || {};
            }
            catch(err){}
            return {};
        },
        builder: function(stateObj){
            var locationPrefix = this.prefix;
            var encryptLocation = this.encrypt;
            var str = JSON.stringify(stateObj, removeEmptyStates); //.replace(/=/,'%3D').replace(/\&/, '%26').replace(/\?/, '%3F');
            
            // there don't have to be empty states in url
            function removeEmptyStates(key, value){
                if(!stateObj[key]) return value;
                if(Object.keys(stateObj[key]).length) return value;
            }
            
            if(encryptLocation) str = encryptString(str);
            return str;
        },
        autoUpdate: false, // auto updates on change
        autoFill: false, // watch and fire state change
        sync: false, // auto update and also watch
        _unbinders:{}, // unbind route change listeners
        
        init: function(state, stateId){
            var locationStore = this;
            if(!(locationStore.autoFill || locationStore.sync)) return;
            
            if(stateId) locationStore._unbinders[ stateId ] = {
                routeUpdate: $rootScope.$on('$routeUpdate', function (){
                    locationStore.fill(state, stateId);
                }),
                routeChangeSuccess: $rootScope.$on('$routeChangeSuccess', function (){
                    locationStore.fill(state, stateId);
                })
            };
            
            locationStore.fill(state, stateId);
        },
        destroy: function(state, stateId){
            return this.unbind(state, stateId);
        },
        unbind: function(state, stateId){
            var locationStore = this;
            var unbindStateIds = stateId ? [stateId] : Object.keys(locationStore._unbinders);
            
            for(var i=0;i<unbindStateIds.length;i++){
                var id = unbindStateIds[i];
                if(locationStore._unbinders[id]){
                    locationStore._unbinders[id].routeUpdate();
                    locationStore._unbinders[id].routeChangeSuccess();
                }
            }
        },
        fill: function(state, stateId){
            var locationStore = this;
            var locationString = $location.search()[ locationStore.prefix ];
            var stateObj = locationStore.parser(locationString) || {};

            $timeout(function(){
                if(id) state.change(id, stateObj[id] || {}, true);
                else for(var id in state.history) state.change(id, stateObj[id] || {}, true);
            });
        },
        update: function(state, stateId){
            var locationStore = this;
            if(!(locationStore.autoUpdate || locationStore.sync)) return;
            
            var locationSearch = locationStore.builder(state.getCurrentState());
            $location.search(locationStore.prefix, locationSearch);
        }
    };
    
    // TODO: implement
    var cookiesStore = {
        //encrypt: false,
        prefix: 'appState',
        //domain:'',
        //expires:'',
        path:'/',
        secure:false,
        autoUpdate: false, // auto updates on change
        autoFill: false, // watch and fire state change
        sync: false, // auto update and also watch
        
        init: function(state, stateId){},
        destroy: function(state, stateId){},
        unbind: function(state, stateId){},
        fill: function(state, stateId){
            var locationStore = this;
            var stateObj = $cookies.getObject(locationStore.prefix) || {};

            $timeout(function(){
                if(id) state.change(id, stateObj[id] || {}, true);
                else for(var id in state.history) state.change(id, stateObj[id] || {}, true);
            });
        },
        update: function(state, stateId){
            var locationStore = this;
            if(!(locationStore.autoUpdate || locationStore.sync)) return;

            $cookies.putObject(locationStore.prefix, state.getCurrentState(), {
                domain: locationStore.domain,
                expires: locationStore.expires,
                path: locationStore.path,
                secure: locationStore.secure,
            });
        }
    };

	var defaultOpts = {
		maxHistoryStates: 5,
        store: locationStore
	};

	function StateService(opts){
        opts = opts || {};
        
        angular.merge(this, {}, defaultOpts, opts);
		this.history = {};
        this.changeListeners = [];
        
		return this;
	}
    
    StateService.locationStore = locationStore;
    StateService.cookiesStore = cookiesStore;

	StateService.prototype.create = 
	StateService.prototype.register = function(id, opts){
        opts = opts || {};
        var state = this;
		if(state.history[id]) return state.history[id];
        
        var stateHistory = [];
		stateHistory.maxHistoryStates = opts.maxHistoryStates || state.maxHistoryStates;
        
        if(opts.store === 'location') opts.store = locationStore;
        if(opts.store === 'cookies') opts.store = cookiesStore;
        
        stateHistory.store = angular.merge({}, state.store, opts.store || {});
        stateHistory.changeListeners = [];
        stateHistory.currentStateIndex = -1;
        state.history[id] = stateHistory;
        
        state.history[id].store.init(state, id);
		return state.history[id];
	};

    StateService.prototype.changeState = 
	StateService.prototype.change = function(id, value, disableStoreUpdate) {
		if(!angular.isObject(value)) throw new Error('StateService: cannot change state, value have to be object and is "' +value+ '"');
		var state = this;
        state.history[id] = state.history[id] || state.register(id);
        
		var currIndex = state.history[id].currentStateIndex;
		var howManyRemove = state.history[id].length ? state.history[id].length - 1 - currIndex : 0;

		state.history[id].splice(currIndex + 1, howManyRemove);
		state.history[id] = state.history[id];
		state.history[id].push( angular.merge({}, value) );
		if(state.history[id].length > state.history[id].maxHistoryStates) state.history[id].splice(0,1);
		else state.history[id].currentStateIndex++;
        
        if(!disableStoreUpdate){
            state.history[id].store.update(state, id);
        }
        
        var changedFromStore = disableStoreUpdate;
        return state.fireChange(id, null, changedFromStore);
	};
    
    StateService.prototype.updateState = 
    StateService.prototype.update = function(id, value){
        if(!angular.isObject(value)) throw new Error('StateService: cannot change state, value have to be object and is "' +value+ '"');
		var state = this;
        state.history[id] = state.history[id] || state.register(id);
        if(!state.history[id].length) return state; // nothing to update, there is no state yet
        
		var currIndex = state.history[id].currentStateIndex;
		state.history[id][ currIndex ] = angular.merge({}, value);
        return state;
    };

	StateService.prototype.fireChange = function(id, oldValue, changedFromStore) {
		if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
		
        var historyIndex = this.history[id].currentStateIndex;
		var specChangeListeners = this.history[id].changeListeners;
		oldValue = oldValue || this.getPrevState(id) || {};
		var newValue = this.getCurrentState(id) || {};

		for(var i=0;i<specChangeListeners.length;i++) specChangeListeners[i]( newValue, oldValue, changedFromStore, historyIndex ); 
		for(var i=0;i<this.changeListeners.length;i++) this.changeListeners[i]( id, newValue, oldValue, changedFromStore, historyIndex ); 
		return this;
	};

	StateService.prototype.watch = 
	StateService.prototype.onChange = function(id, fnc) {
		var state = this;
        if(arguments.length === 1) {
			fnc = arguments[0];
			id = null;
		}

		if(id) {
            state.history[id] = state.history[id] || state.register(id);
			state.history[id].changeListeners.push(fnc);
		}
		else state.changeListeners.push(fnc);
		return state;
	};

	StateService.prototype.unWatch = 
	StateService.prototype.unbindChange = 
	StateService.prototype.offChange = function(id, fnc) {
		if(arguments.length === 1) {
			fnc = arguments[0];
			id = null;
		}

		var index;

		if(id) {
			if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
			index = this.history[id].changeListeners.indexOf(fnc);
			if(index >= 0) this.history[id].changeListeners.splice(index, 1);
		}
		else {
			index = this.changeListeners.indexOf(fnc);
			if(index >= 0) this.changeListeners.splice(index, 1);
		}
		return this;
	};
    
    StateService.prototype.clear = function(id) {
        if(id) {
            this.history[id].splice(0, this.history[id].length);
            this.history[id].changeListeners = [];
            this.history[id].currentStateIndex = -1;
        }
        else {
            this.history = {};
            this.changeListeners = [];
        }
        return this;
    };
    
    StateService.prototype.destroy = function(id) {
        if(id) {
            this.history[id].store.unbind(this, id);
            this.store.unbind(this, id);
            this.clear(id);
            delete this.history[id];
        }
        else {
            this.history = {};
            this.changeListeners = [];
            this.store.unbind(this, id);
            for(var h in this.history) this.history[h].store.unbind(this, h);
        }
        return this;
    };

	StateService.prototype.getCurrentState = function(id) {
		if(arguments.length === 0){
			var states = {};
			for(var id in this.history) states[id] = this.history[id][ this.history[id].currentStateIndex ];
			return states;
		}

		if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
		return this.history[id][ this.history[id].currentStateIndex ];
	};

	StateService.prototype.getPrevState = function(id) {
		if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
		var prevIndex = this.history[id].currentStateIndex - 1;
		if(prevIndex < 0) prevIndex = 0;
		return this.history[id][ prevIndex ];
	};

	StateService.prototype.getNextState = function(id) {
		if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
		var nextIndex = this.history[id].currentStateIndex + 1;
		if(nextIndex >= this.history[id].length) nextIndex = this.history[id].length ? this.history[id].length - 1 : 0;
		return this.history[id][ nextIndex ];
	};

    StateService.prototype.getFutureState = function(id, value){
        var futureState = {};
		if(arguments.length === 2){
			futureState[id] = value;
			futureState = angular.merge({}, this.getCurrentState(), futureState);
		}
		else futureState = this.getCurrentState();
		return futureState;
    };
    
    function moveState(indexIncrement){
        return function(id) {
            if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
            var oldValue = this.getCurrentState(id);
            var currStateIndex = this.history[id].currentStateIndex + indexIncrement;
            if(currStateIndex < 0) currStateIndex = 0;
            if(currStateIndex >= this.history[id].length) currStateIndex = this.history[id].length ? this.history[id].length - 1 : 0;
            this.history[id].currentStateIndex = currStateIndex;
            return oldValue === this.getCurrentState(id) ? this : this.fireChange(id, oldValue);
        };
    }

    StateService.prototype.undo = moveState(-1);
    StateService.prototype.redo = moveState(1);

	StateService.prototype.undoAll = function() {
        for(var id in stateObj) this.undo(id);
	};

	StateService.prototype.redoAll = function() {
        for(var id in stateObj) this.redo(id);
	};

	return StateService;
}]);