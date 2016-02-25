
/**
 *                                                  NE REST
 * ***************************************************************************************************************************
 */

/*
 * RestResource Constructor
 *
 * @example:
 * 
 * // define resource
 * var cars = new RestResource({
        baseUrl:'https://yourservice/cars',

        // parsing
        dataKey:'data', // data key, if data is property of response object, e.g. { data:..., status:...}
        resourceListKey: 'this', // list of resources - if there is no wrapper in response object, data is resource, resourceListKey:'this'
        resourceKey: 'this', // single resource data - if there is no wrapper in response object, data is resource, resourceKey:'this'
        idKey:'id', // key of id, sometimes id is represented by another key, like "_id", or "productId"
        errorKey:'data', // if response status !== 200, parse errors

        // if response contains pagination
        paginationCountKey:'pagination.count',
        paginationPageKey:'pagination.page',
        paginationPagesCountKey:'pagination.pages',
        paginationHasNextKey:'pagination.next',
        paginationHasPrevKey:'pagination.prev',

        // additional data to map to result - will be added only if it is defined in response
        additionalDataKeys:{
            // 'data.max_score':'maxScore' - example result of "one" { id:..., maxScore:24 }, or "all" [{ id:... }, { id:... }].maxScore = 24 
        },
        defaultQuery:{},

        urlBuilder: urlBuilder,
        queryStringBuilder: queryStringBuilder,

        // queryString builder preferences
        queryKey: null, // if there is query Key, whole query will be stringified into one query string key
        queryPageKey: '$page',
        queryLimitKey: '$limit',
        querySortKey: '$sort',

        // onError: function(status, data){ ... }
        // onSuccess: function(status, data){ ... }
        // onProgress: function(status, data){ ... }

        transformRequest:{
            removePrefixedProps:'$'
        },

        transformResponse:{
            dateStringsToDates:true
        },

        commands:{
            one:{
                method:'GET',
                url:'/{id}',
                // extend resource level options in current command
                // idKey, dataKey, resourceKey, resourceListKey, errorKey, pagination keys, headers, transformations,  etc ...
            },
            all:{ method:'GET', isList:true },
            find:{ method:'GET', isList:true }, // alias for "all"
            create:{ method:'POST', url:'/{id}' },
            update:{ method:'PUT', url:'/{id}' },
            remove:{ method:'DELETE', url:'/{id}' },

            // upload:{ method:'POST-MULTIPART', url:'/{id}' }
            // customCommandName:{  method:'POST', url:'/{id}/{command}/{deep.prop1}/{propTwo}.json', body:true  }
        }
    });

    // use resource:
    
    // query is empty
    cars.create( {body}, [successCallback,] [errorCallback]);
    
    // query and body defined
    cars.create( {query}, {body}, [successCallback,] [errorCallback]);
    
    // id and body is defined
    cars.create( {id}, {body}, [successCallback,] [errorCallback]);
    
    // id is defined, query and body is empty
    cars.one( {id}, [successCallback,] [errorCallback]);
    
    // id, query and body is empty, usually when getting all documents
    cars.find( [successCallback,] [errorCallback]);
    
    // http method with body, but body is not set - use option "body:false" in command opts to avoid resource thinking that first argument is body
    cars.find( {query}, [successCallback,] [errorCallback]);
    
    // upload can have progressCallback
    cars.create( {body}, [successCallback,] [errorCallback,] [progressCallback]);
 *
 */


// TODO:
// request, response transform:
// datetime json parser - test
// removePrefixedProps - test
// escapeKeyNames - after parsing
// objectToArray - after parsing
// syncDST - after parsing
// changeZone - after parsing

angular.module('neRest',['neObject','neNotifications','neLoading'])
.config(['$httpProvider', function($httpProvider) {
    // add default XHR header
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
}])
.factory('NeRestResource', ['$http',
                            '$timeout',
                            'neObject',
                            'neNotifications',
                            'neLoading',
                            'NeResourceTransformators.dateStringsToDates',
                            'NeResourceTransformators.removePrefixedProps',
                            function($http, $timeout, object, notify, loading, dateStringsToDates, removePrefixedProps){
    
    var defaultResourceOpts = {
        baseUrl:'/yoururl',
        urlEndSlash:false,
        
        // default headers for every request
        headers:{ 'Content-Type': 'application/json' },
        
        // parsing
        dataKey:'data', // data key, if data is property of response object, e.g. { data:..., status:...}
        resourceListKey: 'this', // list of resources - if there is no wrapper in response object, data is resource, resourceListKey:'this'
        resourceKey: 'this', // single resource data - if there is no wrapper in response object, data is resource, resourceKey:'this'
        idKey:'id', // key of id, sometimes id is represented by another key, like "_id", or "productId"
        errorKey:'data', // if response status !== 200, parse errors
        
        // if response contains pagination
        paginationCountKey:'pagination.count',
        paginationPageKey:'pagination.page',
        paginationPagesCountKey:'pagination.pages',
        paginationHasNextKey:'pagination.next',
        paginationHasPrevKey:'pagination.prev',
        
        // additional data to map to result - will be added only if it is defined in response
        additionalDataKeys:{
            // 'data.max_score':'maxScore' - example result of "one" { id:..., maxScore:24 }, or "all" [{ id:... }, { id:... }].maxScore = 24 
        },
        
        responseErrors: {
            '400':function(data, status, headers){
                var text = data;
                if(angular.isObject(data)) {
                    text = '';
                    for(var key in data){
                        text += key + ': ' + data[key] + ', ';
                    }
                }
                notify.error('Validation Failed', text);
            },
            '403':function(data, status, headers){
                notify.error('Access Denied', 'Try logout and login again, please');
            },
            '404':function(data, status, headers){
                notify.error('Document or his version not found','Try refresh page, please');
            },
            '409':function(data, status, headers){
                notify.error(data);
            },
            'default':function(data, status, headers){
                notify.error('Connection Failed', 'Try later, please');
            }
        },
        
        defaultQuery:{},
        
        urlBuilder: urlBuilder,
        queryStringBuilder: queryStringBuilder,
        
        // queryString builder preferences
        queryKey: null, // if there is query Key, whole query will be stringified into one query string key
        queryPageKey: '$page',
        queryLimitKey: '$limit',
        querySortKey: '$sort',
        
        // onError: function(status, data){ ... }
        // onSuccess: function(status, data){ ... }
        // onProgress: function(status, data){ ... }
        
        transformRequest:{
            removePrefixedProps:'$'
        },
        
        transformResponse:{
            dateStringsToDates:true
        },
        
        commands:{
            one:{
                method:'GET',
                url:'/{id}',
                // extend resource level options in current command
                // idKey, dataKey, resourceKey, resourceListKey, errorKey, pagination keys, headers, transformations,  etc ...
            },
            all:{ method:'GET', isList:true },
            find:{ method:'GET', isList:true }, // alias for "all"
            create:{ method:'POST', url:'/{id}' },
            update:{ method:'PUT', url:'/{id}' },
            remove:{ method:'DELETE', url:'/{id}' },
            
            // upload:{ method:'POST-MULTIPART', url:'/{id}' }
            // customCommandName:{  method:'POST', url:'/{id}/{command}/{deep.prop1}/{propTwo}.json', body:true  }
        }
    };
    
    /*
     * REQUEST BUILDERS
     */
    
    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }
    
    function replaceStringAll(str, whatStr, withStr){
        var regexp = new RegExp( escapeRegExp(whatStr), 'g' );
        return str.replace(regexp, withStr);
    }
    
    function unifyUrlPath(str, onlyLastSlash){
        if(onlyLastSlash) return str.replace(/\/$/,'');
        
        var prefix = '';
        if(!!str.match(/^http:/)) { prefix = 'http:/'; str = str.substring(6); }
        if(!!str.match(/^https:/)) { prefix = 'https:/'; str = str.substring(7); }
        if(!!str.match(/^\/\//)) { prefix = '/'; str = str.substring(1); }
        
        str = ('/' + str + '/').replace(/\/\/+/g,'/');
        return prefix + str.substring(0, str.length - 1);
    }
                              
    function isAbsoluteUrl(str){
        return !!str.match(/^http:/) || !!str.match(/^https:/) || !!str.match(/^\/\//);
    }
    
    function getUrlParams(urlTemplate){
        var urlParams = (urlTemplate || '').match(/\{([^\{\}]+)/g) || [];
        for(var i=0;i<urlParams.length;i++) urlParams[i] = urlParams[i].substring(1);
        return urlParams;
    }
    
    function stringifyWithoutQuotes(value){
        if(value===undefined || value===null) return '';
        return JSON.stringify(value).replace(/^"/,'').replace(/"$/,'');
    }
    
    function urlBuilder(baseUrl, urlTemplate, params, cmdName) {
        var resource = this;
        urlTemplate = unifyUrlPath(urlTemplate || '', true);
        var url = isAbsoluteUrl(urlTemplate) ? urlTemplate : (baseUrl + ((urlTemplate[0]==='/' || baseUrl==='') ? '' : '/') + urlTemplate);
        var urlParams = resource.options.commands[cmdName].urlParams;
        var value, paramValue;
        
        for(var i=0;i<urlParams.length;i++){
            paramValue = object.deepGet(params, urlParams[i]);
            value = urlParams[i] === '_command' ? cmdName : (paramValue===undefined ? '' : paramValue);
            if(typeof value === 'string') value = value.replace(/\//g, '%2F').replace(/\?/g, '%3F').replace(/#/g,'%23'); // escape "/","?","#"
            url = replaceStringAll(url,'{' +urlParams[i]+ '}', stringifyWithoutQuotes(value));
        }
        
        url = unifyUrlPath(url, true);
        return url.indexOf('?') > -1 ? url.replace(/([^\/])\?/,'$1/?') : url +'/'; // add last slash to ensure server will know this is resource path, not static file
    }                         
                                
    function queryStringBuilder(query, cmdName) {
        var resource = this,
            queryString = '',
            cmdOpts = resource.options.commands[cmdName],
            opts = resource.options,
            queryKey = cmdOpts.queryKey || opts.queryKey,
            urlParams = cmdOpts.urlParams;
        
        if(queryKey) {
            // don't render empty query
            if(Object.keys(query).length) return '?' + queryKey + '=' + JSON.stringify(query);
            return '';
        }
        
        for(var key in query){
            if(query.hasOwnProperty(key) && urlParams.indexOf(key) === -1) {
                if(Array.isArray(query[key])){
                    for(var i=0;i<query[key].length;i++) queryString += '&'+key+'='+stringifyWithoutQuotes(query[key][i]);
                }
                else if(query[key] !== undefined) queryString += '&'+key+'='+stringifyWithoutQuotes(query[key]);
            }
        }
        return queryString ? ('?' + queryString.substring(1)) : '';
    }
    
    /*
     * RESOURCE PARSERS
     */
    
    function parseResource(opts, cmdName, data, resourceData){
        var cmdOpts = opts.commands[cmdName],
            dataKey = cmdOpts.dataKey || opts.dataKey,
            resourceKey = cmdOpts.resourceKey || opts.resourceKey,
            idKey = cmdOpts.idKey || opts.idKey;
        
        if(resourceData){
            resourceData = object.deepGet(resourceData, resourceKey);
        }
        else if(data){
            var parsedData = object.deepGet(data, dataKey);
            resourceData = object.deepGet(parsedData, resourceKey);
        }
        
        if(resourceData) {
            var id = object.deepGet(resourceData, idKey);
            if(id !== undefined) resourceData.id = id;
        }
        return resourceData;
    }
    
    function parseResourceList(opts, cmdName, data){
        var parsedData,
            cmdOpts = opts.commands[cmdName],
            isList = cmdOpts.isList,
            dataKey = cmdOpts.dataKey || opts.dataKey,
            resourceListKey = cmdOpts.resourceListKey || opts.resourceListKey;
        
        parsedData = object.deepGet(data, dataKey);
        if(resourceListKey) parsedData = object.deepGet(parsedData, resourceListKey);
        var list = [];
        
        if(Array.isArray(parsedData)) for(var i=0;i<parsedData.length;i++){
            list.push(parseResource(opts, cmdName, null, parsedData[i]));
        }
        
        return list;
    }
    
    function parsePagination(opts, cmdName, data, query){
        var cmdOpts = opts.commands[cmdName];
        var queryPageKey = cmdOpts.queryPageKey || opts.queryPageKey;
        
        var pagination = {
            count: object.deepGet(data, cmdOpts.paginationCountKey || opts.paginationCountKey) || 0,
            page: object.deepGet(data, cmdOpts.paginationPageKey || opts.paginationPageKey) || object.deepGet(query, queryPageKey) || 0,
            pages: object.deepGet(data, cmdOpts.paginationPagesCountKey || opts.paginationPagesCountKey) || 0,
            next: object.deepGet(data, cmdOpts.paginationHasNextKey || opts.paginationHasNextKey),
            prev: object.deepGet(data, cmdOpts.paginationHasPrevKey || opts.paginationHasPrevKey)
        };
        
        // calculate has next/prev if page and pages are defined
        if(pagination.page !== undefined && pagination.pages !== undefined && (pagination.next === undefined || pagination.prev === undefined)){
            pagination.next = pagination.page < pagination.pages;
            pagination.prev = pagination.page > 1;
        }
        
        return pagination;
    }
    
    function parseAdditionalKeys(opts, cmdName, data, parsedData){
        var cmdOpts = opts.commands[cmdName],
            value,
            keys = cmdOpts.additionalDataKeys || opts.additionalDataKeys;
        
        for(var key in keys){
            value = object.deepGet(data, key);
            if(value !== undefined) object.deepSet(parsedData, keys[key], value);
        }
        return parsedData;
    }
    
    /*
     * RESPONSE HANDLERS
     */
                                
    function execCbs(fncs){
        var args = [], i;
        for(i=1;i<arguments.length;i++) args.push(arguments[i]);
        for(i=0;i<fncs.length;i++){
            if(typeof fncs[i] === 'function' && fncs[i].apply(this, args) === true) return;
        }
    }
    
    function handleSuccess(query, opts, cmdName, successCbs){
        return function(response){
            
            var httpOpts = response.config,
                cmdOpts = opts.commands[cmdName],
                data = applyTransformators(response.data, cmdOpts.transformResponse),
                status = response.status,
                headers = response.headers,
                isList = cmdOpts.isList,
                parsedData;
            
            if(isList) {
                parsedData = parseResourceList(opts, cmdName, data) || [];
                parsedData.pagination = parsePagination(opts, cmdName, data, query);
            }
            else {
                parsedData = parseResource(opts, cmdName, data);
            }
            
            parsedData = parseAdditionalKeys(opts, cmdName, data, parsedData);
            execCbs([ cmdOpts.onData, opts.onData ], parsedData, (parsedData||{}).pagination, data, status, isList, cmdName);
            execCbs(successCbs, parsedData, (parsedData||{}).pagination, data, status);
        };
    }
    
    function handleError(query, opts, cmdName, errorCbs){
        return function(response){
            var httpOpts = response.config,
                cmdOpts = opts.commands[cmdName],
                data = applyTransformators(response.data, cmdOpts.transformResponse),
                status = response.status,
                headers = response.headers,
                responseErrorCbs = errorCbs.concat([ 
                    (cmdOpts.responseErrors||{})[status] || (cmdOpts.responseErrors||{})['default'], 
                    opts.responseErrors[status] || opts.responseErrors['default']
                ]),
                errorKey = cmdOpts.errorKey || opts.errorKey,
                parsedError = object.deepGet(data, errorKey);
            
            execCbs(responseErrorCbs, parsedError, status, headers);
        };
    }
    
    /*
     * HTTP UPLOAD HANDLER
     */
    
    var xhr = (function () {
        try { return new XMLHttpRequest(); } catch (e) {}
        try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch (e1) {}
        try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch (e2) {}
        try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch (e3) {}
        throw new Error('This browser does not support XMLHttpRequest.');
    })();
                              
    function upload(cmdName, query, httpOpts, successCbs, errorCbs, progressCbs){
        var opts = this.options;
        var url = httpOpts.url;
        var headers = httpOpts.headers;
        var data = httpOpts.data;
        var fd = new FormData();
        
        for(var key in data) {
            fd.append(key, data[key]);
        }
        
        function handleResponse(res, type) {
            res = res || {};
            var contentType = res.getResponseHeader('content-type');
            var data = res.responseText;
            var status = res.status ? parseInt(res.status) : 0;
            
            if(contentType && contentType.substring(0,16)==='application/json') {
                try { data = JSON.parse(res.responseText); }
                catch(e) { status = 0; }
            }
            
            var response = {
                data: data,
                status: status,
                headers: res.headers,
                httpOpts: {},
            };
            
            xhrListeners('removeEventListener');
            loading.reqEnded();
            
            if(status >= 200 && status <= 299) handleSuccess(query, opts, cmdName, successCbs)(response);
            else handleError(query, opts, cmdName, errorCbs)(response);
        }
        
        function loadListener(e){ handleResponse(e.target, 'load'); }
        function errorListener(e){ handleResponse(e.target, 'error'); }
        function abortListener(e){ handleResponse(e.target, 'abort'); }
        function progressListener(e) {
            if(!progressCbs) return;
            if (e.lengthComputable) execCbs(progressCbs, Math.ceil(100 * e.loaded / e.total));
            else execCbs(progressCbs, 50); // Unable to compute progress information since the total size is unknown
        }
        
        function xhrListeners(elProp){
            xhr[elProp]('load', loadListener, false);
            xhr[elProp]('error', errorListener, false);
            xhr[elProp]('abort', abortListener, false);
            xhr.upload[elProp]('progress', progressListener, false);
        }
        
        $timeout(function(){
            xhrListeners('addEventListener');
            loading.reqStarted(); // show loading notification
            xhr.open('POST', url, true);
            xhr.send(fd);
        });
    }
    
    /*
     * RESOURCE CONSTRUCTOR
     */
    
    function Resource(){
        var args = [ {}, Resource.defaults ];
        for(var i=0;i<arguments.length;i++) args.push(arguments[i]);
        var opts = angular.merge.apply(angular, args);
        opts.baseUrl = unifyUrlPath(opts.baseUrl, true);
        
        var resource = this;
        resource.options = opts;
        
        for(var cmdName in opts.commands){
            // extend transformations
            opts.commands[ cmdName ].transformRequest = angular.merge({}, opts.transformRequest, opts.commands[ cmdName ].transformRequest || {});
            opts.commands[ cmdName ].transformResponse = angular.merge({}, opts.transformResponse, opts.commands[ cmdName ].transformResponse || {});
            
            resource[ cmdName ] = (function(cmdName){
                return function(){
                    var args = [cmdName];
                    for(var i=0;i<arguments.length;i++){
                        args.push(arguments[i]);
                    }
                    return resource.command.apply(resource, args);
                };
            })(cmdName);
        }
        
        return resource;
    }
    
    Resource.defaults = defaultResourceOpts;
    Resource.define = Resource.create = function(opts){ return new Resource(opts); };
    Resource.dataTransformators = {
        'dateStringsToDates': dateStringsToDates,
        'removePrefixedProps': removePrefixedProps
    };
    
    /*
     * RESOURCE PROTOTYPE METHODS
     */
    
    Resource.prototype.command = function(cmdName, idOrQuery, data, successCb, errorCb, progressCb){
        var resource = this;
        if(!resource.options.commands[cmdName]) throw new Error('This resource has no command "' +cmdName+ '" defined');
        
        // argument idOrQuery is optional
        if(typeof arguments[1] === 'function'){
            progressCb = arguments[3];
            errorCb = arguments[2];
            successCb = arguments[1];
            idOrQuery = {};
            data = null;
        }
        // argument data is optional
        else if(typeof arguments[2] === 'function') {
            progressCb = arguments[4];
            errorCb = arguments[3];
            successCb = arguments[2];
            idOrQuery = arguments[1];
            data = null;
        }
        
        var query,
            opts = resource.options,
            cmdOpts = opts.commands[cmdName],
            baseUrl = (typeof cmdOpts.baseUrl === 'string' ? cmdOpts.baseUrl : opts.baseUrl) || '',
            method = (cmdOpts.method || 'GET').toLowerCase(),
            canHaveBody = typeof cmdOpts.body === 'boolean' ? cmdOpts.body : (['options','post','post-multipart','upload','put','delete'].indexOf(method) > -1),
            headers = cmdOpts.headers || opts.headers,
            urlTemplate = (typeof cmdOpts.url === 'string' ? cmdOpts.url : opts.url) || '',
            urlBuilder = cmdOpts.urlBuilder || opts.urlBuilder,
            urlEndSlash = cmdOpts.urlEndSlash || opts.urlEndSlash,
            queryStringBuilder = cmdOpts.queryStringBuilder || opts.queryStringBuilder,
            defaultQuery = cmdOpts.defaultQuery || opts.defaultQuery,
            transformRequest = cmdOpts.transformRequest,
            idKey = cmdOpts.idKey || opts.idKey,
            pageKey = cmdOpts.queryPageKey || opts.queryPageKey,
            limitKey = cmdOpts.queryLimitKey || opts.queryLimitKey,
            sortKey = cmdOpts.querySortKey || opts.querySortKey;
            
        opts.commands[cmdName].urlParams = cmdOpts.urlParams || getUrlParams(urlTemplate);
        
        // if data is missing, and idOrQuery is object, and this method can have body, therefore data = idOrQuery
        if(data === null && canHaveBody && angular.isObject(idOrQuery)) {
            data = arguments[1];
            idOrQuery = null;
            query = {};
        }
        else {
            query = {};
            if(idOrQuery && (typeof idOrQuery === 'string' || typeof idOrQuery === 'number')) {
                query = object.deepSet(query, idKey, idOrQuery);
            }
            else query = idOrQuery;
            query = angular.merge({}, defaultQuery, query || {});
        }
        
        if(query.$page === 0) throw new Error('NeRestResource: query.$page is equal to zero, must be greater');
        
        // replace default pagination props by custom if defined
        if(pageKey !== '$page'){
            query = object.deepSet(query, pageKey, query.$page);
            delete query.$page;
        }
        if(limitKey !== '$limit'){
            query = object.deepSet(query, limitKey, query.$limit);
            delete query.$limit;
        }
        if(sortKey !== '$sort'){
            query = object.deepSet(query, sortKey, query.$sort);
            delete query.$sort;
        }
        
        var successCbs = [ successCb, cmdOpts.onSuccess, opts.onSuccess ];
        var errorCbs = [ errorCb, cmdOpts.onError, opts.onError ];
        var progressCbs = [ progressCb, cmdOpts.onProgress, opts.onProgress ];
        
        var params = angular.merge({}, data||{}, query||{});
        var urlPath = urlBuilder.call(resource, baseUrl, urlTemplate, params, cmdName);
        if(urlEndSlash && urlPath.indexOf('?')===-1) urlPath += '/';
        var queryString = queryStringBuilder.call(resource, query, cmdName);
        if(urlPath.indexOf('?') > -1 && queryString.indexOf('?') === 0) queryString = '&'+queryString.substring(1);
        
        var httpOpts = {
            url: urlPath + queryString,
            method: method,
            data: applyTransformators(data, transformRequest),
            headers: headers
        };
        
        if(method === 'post-multipart' || method === 'upload') upload.call(resource, cmdName, query, httpOpts, successCbs, errorCbs, progressCbs);
        else $http(httpOpts).then(handleSuccess(query, opts, cmdName, successCbs), handleError(query, opts, cmdName, errorCbs));
    };
    
    
    /*
     * REQ/RES TRANSFORMATORS
     */
    
    function applyTransformators(data, transforms){
        transforms = transforms || {};
        var copy = data;
        if(Object.prototype.toString.call(data) === '[object Object]') copy = object.extend(true, {}, data);
        if(Array.isArray(data)) copy = object.extend(true, [], data);
        
        for(var id in transforms){
            if(Resource.dataTransformators[ id ]) Resource.dataTransformators[ id ]( copy, transforms[id] );
        }
        return copy;
    }
    
    return Resource;
    
}])
.factory('NeResourceTransformators.dateStringsToDates', [function(){
    
    // auto parse dates
    var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
    var regexIsoJson = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    
    function dateStringsToDates(input, useIsoJson) {
        var value, match, milliseconds;
        
        // try to parse if input is string
        if(typeof input === 'string' && (match = input.match(useIsoJson ? regexIsoJson : regexIso8601))) {
            milliseconds = Date.parse(match[0]);
            if (!isNaN(milliseconds)) {
                input = new Date(milliseconds);
            }
            return input;
        }
        
        // Ignore things that aren't objects
        else if(typeof input !== 'object') return input;
        
        for(var key in input){
            value = input[key];
            
            // Check for string properties which look like dates.
            if(typeof value === 'string' && (match = value.match(useIsoJson ? regexIsoJson : regexIso8601))) {
                milliseconds = Date.parse(match[0]);
                if (!isNaN(milliseconds)) {
                    input[key] = new Date(milliseconds);
                }
            }
            else if (typeof value === 'object') {
                // Recurse into object
                dateStringsToDates(value, useIsoJson);
            }
        }        
        return input;
    }
    
    return dateStringsToDates;
}])
.factory('NeResourceTransformators.removePrefixedProps', [function(){
    
    function removePrefixedProps(input, prefix) {
        
        // Ignore things that aren't objects.
        if(typeof input !== 'object') return input;
        
        for(var key in input) {
            if(input.hasOwnProperty(key)) {
                var value = input[key];
                
                if(key.indexOf(prefix)===0) delete input[key];
                else if(typeof value === 'object') removePrefixedProps(value, prefix);
            }
        }
    }
    
    return removePrefixedProps;
}]);