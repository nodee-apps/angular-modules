
/**
 *                                                  NE OBJECT
 * ***************************************************************************************************************************
 */

angular.module('neObject',[])
.factory('neObject', [function(){
    
    var hasOwn = Object.prototype.hasOwnProperty;
    function isPlainObject(obj) {
        if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
            return false;

        var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
        var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');
        // Not own constructor property must be Object
        if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
            return false;
        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.
        var key;
        for ( key in obj ) {}
        return key === undefined || hasOwn.call( obj, key );
    }

    function extend() {
        var options, name, src, copy, copyIsArray, clone,
            reservedInstances = this.extendReservedInstances,
            object = this,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;
        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }
        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && typeof target !== "function") {
            target = {};
        }
        for ( ; i < length; i++ ) {
            options = arguments[ i ];
            
            if(isReservedInstance(options, reservedInstances)){
                target = options;
                return target;
            }
            
            // Only deal with non-null/undefined values
            else if ( options !== null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];
                    
                    // prevent modifying reserved instances
                    if ( isReservedInstance(copy, reservedInstances) ){
                        target[ name ] = copy;
                        continue;
                    }
                    
                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }
                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) ) ) {
                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && Array.isArray(src) ? src : [];
                        } else {
                            clone = src && isPlainObject(src) ? src : {};
                        }  
                        // Never move original objects, clone them
                        target[ name ] = object.extend( deep, clone, copy );
                    // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }
        // Return the modified object
        return target;
    }
    
    function isReservedInstance(value, reservedInstances){
        for(var i=0;i<reservedInstances.length;i++){
            if(value instanceof reservedInstances[i]) return true;
        }
        return false;
    }
    
    function deepReplace(parentObj, cb, keyPath){ // cb(keyPath, key, value)
        if(!angular.isObject(parentObj)) return;
        keyPath = keyPath || '';
        var value;
        for(var key in parentObj){
            if(angular.isObject(parentObj[key])) deepReplace(parentObj[key], cb, (keyPath==='' ? key : keyPath + '.' + key));
            value = cb((keyPath==='' ? key : keyPath + '.' + key), key, parentObj[key]);
            if(!value) delete parentObj[key];
            else parentObj[key] = value;
        }
    }
    /**
     * Define cascading props in objects in namespace separated by dot,
     * if props are on lower level, it will create empty object
     * @param {Object} parent base object where you want add props
     * @param {String} namespace dot separated
     * @param {Object} value value to add to object prop
     * @param {String} mode if "push", it will add value to array
     * @returns {Object}  parent object after properties are added
     */
    function deepSet(parent, namespace, value, mode) {
        // if(typeof value==='string') value = value.replace(/(\r\n|\r|\n)\s*$/, ''); // replace line endings and white spaces
        var parts = namespace.split('.');
        var current = parent;
        if(namespace==='this') {
            if(mode==='push') parent.push(value);
            else parent = value.toString();
        }
        else {
            for(var i=0; i<parts.length; i++) {
            if(i >= parts.length-1) {
                if(mode==='push') current[parts[i]].push(value);
                else current[parts[i]] = value;
            }
            else current[parts[i]] = current[parts[i]]===undefined || current[parts[i]]===null ? {} : current[parts[i]];    
            current = current[parts[i]];
            }
        }
        return parent;
    }
    
    function deepGet(parent, namespace) {
        if((!parent && parent!==false && parent!==0) || typeof parent === 'function') return undefined;
        if(namespace==='this') return parent;
        
        var parts = namespace.split('.');
        var current = parent;
        
        for(var i=0; i<parts.length; i++) {
            if(!current[parts[i]] && current[parts[i]]!==false && current[parts[i]]!==0) return undefined;
            else current = current[parts[i]];
        }
        
        // function as value is not allowed
        if(typeof current === 'function') return undefined;
        return current;
    }
    
    function deepRemove(obj, keyPath){
        obj = obj || {};
        keyPath = keyPath || '';
        var keys = keyPath.split('.');
        if(keys.length===0) return;
        if(keys.length===1) { delete obj[keys[0]]; return; }
        
        for(var i=0;i < keys.length-1;i++) {
            obj = obj[keys[i]];
            if(!obj) return;
        }
        delete obj[keys[keys.length-1]]; // delete last prop
    }
    
    function sortArray(keyName, dir, array){
        if(arguments.length===2){
            array = arguments[1];
            dir = 1;
        }
        
        if(dir==='asc') dir=1;
        if(dir==='desc') dir=-1;
        
        array.sort(function(a, b) {
            if (a[keyName] > b[keyName])
              return dir;
            if (a[keyName] < b[keyName])
              return -dir;
            // a must be equal to b
            return 0;
        });
        
        return array;
    }
    
    function objectToArray(obj, sortNamespace, dir){
        var array = [];
        
        for(var key in obj) {
            if(obj.hasOwnProperty(key)){
                obj.$key = key;
                obj.$sortIndex = deepGet(obj[key], sortNamespace);
                array.push(obj[key]);
            }
        }
        return sortArray('$sortIndex', dir || 'asc', array);
    }
    
    function arrayToObject(array, idNamespace){
        if(!angular.isArray(array) || !idNamespace) return {};

        var obj = {}, key;
        for(var i=0;i<array.length;i++){
            key = deepGet(array[i], idNamespace);
            obj[key] = array[i];
        }

        return obj;
    }
    
    return {
        extendReservedInstances:[File, FileList],
        extend:extend,
        setObjValue: deepSet,
        deepSet: deepSet,
        getObjValue: deepGet,
        deepGet:deepGet,
        deepReplace:deepReplace,
        deepRemove:deepRemove,
        objectToArray: objectToArray,
        arrayToObject: arrayToObject
    };
}]);