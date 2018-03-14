
/**
 *                                                  NE QUERY
 * ***************************************************************************************************************************
 */

/*
 * advanced mongodb query builder and parser
 * it can be extended to build and parse another query language
 */


angular.module('neQuery',['neLocal','neObject'])
.config(['neLocalProvider', function(localProvider){
    localProvider.set('default', {
        $eq:'=',
        $lt:'<',
        $lte:'<=',
        $gt:'>',
        $gte:'>=',
        $regex_exact:'exact match',
        $regex_contains:'contains',
        $regex_begins:'begins with',
        $regex_ends:'ends with',
        $in:'is in',
        $ne:'not equal to',
        $regex_ncontains:'not contains',
        $regex_nbegins:'not begins with',
        $regex_nends:'not ends with',
        $nin:'is not in',
        $regex:'custom regex',
        $size:'items count',
        $exists:'exists',
        $and:'and',
        $or:'or',
        OR:'OR',
        AND:'AND',
        choose:'(choose)',

        qtype_short_number:'0-9',
        qtype_short_date:'Date',
        qtype_short_datetime:'Time',
        qtype_short_boolean:'Y/N',
        qtype_short_string:'A-Z',
        qtype_short_array:'[A]',
        qtype_short_object:'{O}',

        qtype_number:'Number',
        qtype_date:'Date',
        qtype_datetime:'Date & Time',
        qtype_boolean:'Boolean',
        qtype_string:'Text',
        qtype_array:'Array',
        qtype_object:'Object',

        qvalue_true:'True',
        qvalue_false:'False',
        Search:'Search',
        'Order By':'Order By',
        'choose field':'choose field',
        'type value':'type value',
        'empty value':'empty value'
    });
}])
.run(['$templateCache', function($templateCache){
    $templateCache.put('neQuery/query.html',
                       '<div class="visible-inline-block">'+
                       '<div ng-repeat-start="query in query track by $index" class="visible-inline-block" style="position:relative;margin:2px" ng-style="{\'margin-top\':$first ? \'0px\' : \'2px\'}">'+
                       '    <small ng-if="!$first && query.logical===\'OR\' && !query.length">{{query.logical | translate}}<br></small>'+
                       '    <div ng-if="!query.length" class="visible-inline-block">'+
                       '        <div class="dropdown visible-inline-block" uib-dropdown keyboard-nav>'+
                       '            <button ng-if="query.onlyPredefinedFields" class="btn btn-sm btn-default" ng-disabled="disabled" uib-dropdown-toggle style="width:142px">'+
                       '                <span class="nowrap" ng-if="query.fieldName">{{query.fieldName}}</span><span class="nowrap" ng-if="!query.fieldName">{{::\'choose field\'|translate}}</span>'+
                       '            </button>'+
                       '            <input ng-if="!query.onlyPredefinedFields" type="text" ng-disabled="disabled" placeholder="{{::\'choose field\'|translate}}" class="input-sm" uib-dropdown-toggle ng-change="query.setFieldByName(query.fieldName);onChange()" ng-model="query.fieldName"/>'+
                       '            <ul ng-if="query.fields.filterByName(query.fieldName, query.field.name).length" class="dropdown-menu" style="max-height:250px;overflow:auto">'+
                       '                <li ng-repeat="field in query.fields.filterByName(query.fieldName, query.field.name)" ng-class="{\'active\':(field.name===query.fieldName)}">'+
                       '                    <a href="" ng-click="query.setField(field);onChange()">'+
                       '			             {{field.name}}'+
                       '			        </a>'+
                       '                </li>'+
                       '            </ul>'+
                       '        </div>'+
                       '        <div class="dropdown visible-inline-block" uib-dropdown keyboard-nav>'+
                       '            <button ng-disabled="query.field.disableOperator || disabled" class="btn btn-default btn-sm btn-intensive" uib-dropdown-toggle style="width:120px">'+
                       '                <span class="class="nowrap"">{{query.operator | translate}}&nbsp;</span>'+
                       '            </button>'+
                       '            <ul class="dropdown-menu" style="min-width:210px;overflow:auto">'+
                       '                <li ng-if="!query.field.disableType" class="text-center" style="padding-top:4px">'+
                       '                    <div class="btn-group btngroup-xs">'+
                       '                        <button class="btn btn-default btn-xs" ng-class="{\'btn-success\':(query.type.name===type)}" style="padding:2px;" uib-tooltip="{{\'qtype_\'+type | translate}}" tooltip-append-to-body="true" ng-repeat="type in query.types" ng-click="query.setType(type);$event.stopPropagation();">'+
                       '                        {{\'qtype_short_\'+type | translate}}'+
                       '                        </button>'+
                       '                    </div>'+
                       '                </li>'+
                       '                <li ng-if="!query.field.disableType" class="divider"></li>'+
                       '                <li ng-repeat="operator in query.type.operators" ng-if="!query.field.allowedOperatorIndexes || query.field.allowedOperatorIndexes.indexOf($index)>-1" ng-class="{\'active\':(query.operator===operator)}">'+
                       '                    <a href="" ng-click="query.setOperator(operator);onChange()">'+
                       '			            <span>{{operator | translate}}</span>'+
                       '			        </a>'+
                       '                </li>'+
                       '            </ul>'+
                       '        </div>'+
                       '        <div class="visible-inline-block" ne-query-value="query"></div>'+
                       '        <div class="btn-group btn-group-xs" ng-if="!disabled">'+
                       '            <button class="btn btn-default" ng-click="query.next(\'AND\');onChange()">{{::\'AND\' | translate}}</button>'+
                       '            <button class="btn btn-default" ng-click="query.next(\'OR\');onChange()">{{::\'OR\' | translate}}</button>'+
                       '            <button class="btn btn-default" ng-click="query.levelDown();onChange()"><i class="fa fa-fw fa-level-down"></i></button>'+
                       '            <button class="btn btn-default" ng-click="close();query.remove();onChange()"><i class="fa fa-fw fa-minus"></i></button>'+
                       '        </div>'+
                       '    </div>'+
                       '    <div ng-if="query.length" class="visible-inline-block" style="position:relative;">'+
                       '        <small>{{ ($first ? \' \' : query.logical) | translate}}<br></small>'+
                       '        <div class="btn-group btn-group-xs" style="position:absolute;right:0px;top:1px" ng-if="!disabled">'+
                       '            <button class="btn btn-default" style="border:1px dashed #999;border-right:none;color:#999;border-bottom: 1px solid transparent;" ng-click="query.next(\'AND\')">{{::\'AND\' | translate}}</button>'+
                       '            <button class="btn btn-default" style="border:none;border-top:1px dashed #999;color:#999;border-bottom: 1px solid transparent;" ng-click="query.next(\'OR\')">{{::\'OR\' | translate}}</button>'+
                       '            <button class="btn btn-default" style="border:1px dashed #999;border-left:none;color:#999;border-bottom: 1px solid transparent;" ng-click="close();query.remove()"><i class="fa fa-minus"></i></button>'+
                       '        </div>'+
                       '        <div class="query-subquery visible-inline-block" ng-include="\'neQuery/query.html\'" style="border:1px dashed #999;padding:8px;margin:2px 0px;"></div>'+
                       '    </div>'+
                       '</div>'+
                       '<br ng-repeat-end>'+
                       '</div>');

    $templateCache.put('neQuery/date.html',
                       '<input type="text" '+
                       '       class="input-sm" '+
                       '       placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}" '+
                       '       uib-datepicker-popup '+
                       '       is-open="query.value_opened" '+
                       '       ng-click="query.value_opened=!query.value_opened" '+
                       '       ng-disabled="disabled" '+
                       '       ng-model="query.value" '+
                       '       ng-change="onChange()">');

    $templateCache.put('neQuery/datetime.html',
                       '<input type="text" '+
                       '       class="input-sm" '+
                       '       placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}"'+
                       '       uib-datetimepicker-popup '+
                       '       show-seconds="true" '+
                       '       is-open="query.value_opened" '+
                       '       ng-click="query.value_opened=!query.value_opened" '+
                       '       ng-disabled="disabled" '+
                       '       ng-model="query.value" '+
                       '       ng-change="onChange()">');

    $templateCache.put('neQuery/number.html',
                       '<input type="number" '+
                       '       class="input-sm" '+
                       '       placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}" '+
                       '       ng-disabled="disabled" '+
                       '       ng-model="query.value" '+
                       '       ng-change="onChange()" '+
                       '       style="width:142px;">');

    $templateCache.put('neQuery/list.html',
                       '<select class="input-sm" '+
                       '        ng-disabled="disabled" '+
                       '        ng-model="query.value" '+
                       '        ng-options="(value | translate) for value in query.field.values" '+
                       '        ng-change="onChange()" '+
                       '        style="width:142px;">'+
                       '</select>');

    $templateCache.put('neQuery/boolean.html',
                       '<select class="input-sm" '+
                       '        ng-disabled="disabled" '+
                       '        ng-model="query.value" '+
                       '        ng-options="(\'qvalue_\'+value | translate) for value in [true,false]" '+
                       '        ng-change="onChange()" '+
                       '        style="width:142px;">'+
                       '</select>');

    $templateCache.put('neQuery/string.html',
                       '<input type="text" '+
                       '       class="input-sm" '+
                       '       placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}" '+
                       '       ng-disabled="disabled" '+
                       '       ng-model="query.value" '+
                       '       ng-change="onChange()"/>');

    $templateCache.put('neQuery/string-suggestions.html',
                       '<div class="dropdown visible-inline-block" uib-dropdown keyboard-nav>'+
                       '    <input type="text" '+
                       '           class="input-sm" '+
                       '           placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}" '+
                       '           uib-dropdown-toggle '+
                       '           ng-disabled="disabled" '+
                       '           ng-model="query.suggestion" '+
                       '           ng-click="(query.field.suggestionMinLength===0 && !query.suggestions) ? query.field.createSuggestions(query, query.suggestion) : null" '+
                       '           ng-change="query.page=1;query.field.onlySuggestedValues ? query.value=null : query.value=query.suggestion;query.field.createSuggestions(query, query.suggestion, true);onChange()">'+
                       '    <ul ng-if="query.suggestions.length" class="dropdown-menu" style="max-height:250px;overflow:auto">'+
                       '        <li ng-if="query.field.pagination" class="text-center" style="padding-top:4px">'+
                       '            <button class="btn btn-xs btn-default" ng-disabled="!query.pagination.prev" ng-click="$event.stopPropagation();query.page=(query.page||1)-1;query.field.createSuggestions(query, query.suggestion)"><i class="fa fa-fw fa-backward"></i></button>'+
                       '            {{query.page||1}}'+
                       '            <button class="btn btn-xs btn-default" ng-disabled="!query.pagination.next" ng-click="$event.stopPropagation();query.page=(query.page||1)+1;query.field.createSuggestions(query, query.suggestion)"><i class="fa fa-fw fa-forward"></i></button>'+
                       '        </li>'+
                       '        <li ng-if="query.field.pagination" class="divider"></li>'+
                       '        <li ng-repeat="value in query.suggestions" ng-class="{\'active\':(value===query.value)}">'+
                       '          <a href="" ng-click="query.value=value.key;query.suggestion=value.name;onChange()">'+
                       '		      {{value.name}}'+
                       '		  </a>'+
                       '        </li>'+
                       '    </ul>'+
                       '</div>');

    $templateCache.put('neQuery/disabled.html',
                       '<input type="text" disabled="disabled" class="input-sm" ng-model="query.value">');

    $templateCache.put('neQuery/sort.html',
                       '<div class="visible-inline-block">'+
                       '<div ng-repeat-start="sort in query.sortBy track by $index" style="display:inline-block;position:relative;margin:2px" ng-style="{\'margin-top\':$first ? \'0px\' : \'2px\'}">'+
                       '    <small>{{::\'Order By\'|translate}}</small>'+
                       '    <div class="visible-inline-block">'+
                       '        <div class="dropdown visible-inline-block" uib-dropdown keyboard-nav>'+
                       '            <button ng-if="query.onlyPredefinedFields" ng-disabled="disabled" class="btn btn-sm btn-default" uib-dropdown-toggle style="width:142px">'+
                       '                <span class="nowrap" ng-if="sort.fieldName">{{sort.fieldName}}</span><span class="nowrap" ng-if="!sort.fieldName">{{::\'choose field\'|translate}}</span>'+
                       '            </button>'+
                       '            <input ng-if="!query.onlyPredefinedFields" type="text" ng-disabled="disabled" placeholder="{{::\'choose field\'|translate}}" class="input-sm" uib-dropdown-toggle ng-change="query.setSortByName(sort.fieldName, $index);onChange()" ng-model="sort.fieldName" />'+
                       '            <ul ng-if="query.fields.filterByName(sort.fieldName, sort.name).length" class="dropdown-menu" style="max-height:250px;overflow:auto">'+
                       '                <li ng-repeat="field in query.fields.filterByName(sort.fieldName, sort.name)" ng-class="{\'active\':(field.name===sort.fieldName)}">'+
                       '                    <a href="" ng-click="query.setSortField(field,$parent.$index);onChange()">'+
                       '        			    {{field.name}}'+
                       '        			</a>'+
                       '                </li>'+
                       '            </ul>'+
                       '        </div>'+
                       '        <div class="btn-group btn-group-xs">'+
                       '            <button class="btn btn-default" ng-disabled="disabled" ng-click="query.toggleSortDirection($index);onChange()">'+
                       '                <i class="fa fa-fw" ng-class="{\'fa-sort-amount-asc\':sort.direction===1,\'fa-sort-amount-desc\':sort.direction===-1}"></i>'+
                       '            </button>'+
                       '            <button class="btn btn-default" ng-disabled="disabled" ng-click="query.addSort($index);onChange()"><i class="fa fa-fw fa-plus"></i></button>'+
                       '            <button class="btn btn-default" ng-disabled="disabled" ng-click="query.removeSort($index);onChange()"><i class="fa fa-fw fa-minus"></i></button>'+
                       '        </div>'+
                       '    </div>'+
                       '</div>'+
                       '<br ng-repeat-end>'+
                       '<button ng-if="!query.sortBy.length" class="btn btn-default btn-sm btn-intensive" ng-disabled="disabled" ng-click="query.addSort();onChange()"><i class="fa fa-fw fa-signal"></i> <span class="hidden-sm">{{::\'Order By\'|translate}}</span></button>'+
                       '</div>');
}])
.directive('neQueryValue',[function(){
    return {
        restrict:'A',
        // require:'ngModel',
        template:'<div ng-include="query.field.template||query.type.templates[query.operator]||query.type.template||query.templates[query.type.name]||query.templates.disabled"></div>',
        //scope:{ query:'=neQueryValue' },
        link: function(elm, scope, attrs, ctrl){

        }
    };
}])
.directive('neQuerySearch',[function(){
    return {
        restrict:'A',
        template: '<div class="pull-left" ne-query="query" ne-query-change="onChange()" ne-query-disabled="disabled"></div>'+
                  '<div class="pull-left hidden-xs" style="width:20px">&nbsp;</div>'+
                  '<div class="pull-left" ne-query-sort="query" ne-query-sort-change="onChange()" ne-query-sort-disabled="disabled"></div>'+
                  '<button ng-disabled="disabled" class="btn btn-primary btn-sm btn-intensive" ng-click="searchClick()" style="margin-left:2px">'+
                  '    <i class="fa fa-fw fa-search"></i>'+
                  '    <span class="hidden-sm">{{::\'Search\' | translate}}</span>'+
                  '</button>',
        scope:{ query:'=neQuerySearch', searchClick:'&neQuerySearchClick', onQuerySearchChange:'&neQuerySearchChange', querySearchEmpty:'=neQuerySearchEmpty', disabled:'=neQuerySearchDisabled' },
        link: function(scope, elm, attrs, ctrl){
            var watchEmptyState = !!attrs.neQuerySearchEmpty;
            scope.onChange = function(){
                scope.query.setDirty();
                if(watchEmptyState) scope.querySearchEmpty = scope.query.isEmpty();
                if(scope.onQuerySearchChange) scope.onQuerySearchChange();
            };
            if(watchEmptyState) scope.querySearchEmpty = scope.query.isEmpty();
        }
    };
}])
.directive('neQuery',[function(){
    return {
        restrict:'A',
        templateUrl: 'neQuery/query.html',
        scope:{ query:'=neQuery', onQueryChange:'&neQueryChange', queryEmpty:'=neQueryEmpty', disabled:'=neQueryDisabled' },
        link: function(scope, elm, attrs, ctrl){
            var watchEmptyState = !!attrs.neQueryEmpty;
            scope.onChange = function(){
                scope.query.setDirty();
                if(watchEmptyState) scope.queryEmpty = scope.query.isQueryEmpty();
                if(scope.onQueryChange) scope.onQueryChange();
            };
            if(watchEmptyState) scope.queryEmpty = scope.query.isQueryEmpty();
        }
    };
}])
.directive('neQuerySort',[function(){
    return {
        restrict:'A',
        templateUrl: 'neQuery/sort.html',
        scope:{ query:'=neQuerySort', onQuerySortChange:'&neQuerySortChange', querySortEmpty:'=neQuerySortEmpty', disabled:'=neQuerySortDisabled' },
        link: function(scope, elm, attrs, ctrl){
            var watchEmptyState = !!attrs.neQuerySortEmpty;
            scope.onChange = function(){
                scope.query.setDirty();
                if(watchEmptyState) scope.querySortEmpty = scope.query.isSortEmpty();
                if(scope.onQuerySortChange) scope.onQuerySortChange();
            };
            if(watchEmptyState) scope.querySortEmpty = scope.query.isSortEmpty();
        }
    };
}])
.constant('neQueryConfig', {
    useRegexBracketsWrap: false
})
.factory('NeQuery',['neLocal','neObject', 'neQueryConfig', function(local, object, queryConfig){

    var templates = {
        query: 'neQuery/query.html',
        sort: 'neQuery/sort.html',
        disabled: 'neQuery/disabled.html',
        number: 'neQuery/number.html',
        string: 'neQuery/string.html',
        boolean: 'neQuery/boolean.html',
        date: 'neQuery/date.html',
        datetime: 'neQuery/datetime.html',
        list: 'neQuery/list.html',
        suggestions: 'neQuery/string-suggestions.html'
    };

    // used when parsing query
    var querySortKey = '$sort';
    var queryOptionKeys = ['$limit', '$page', '$skip', '$sort'];
    var queryOptionKeyPrefix = '$';

    function isRegexString(str){
        if(str === undefined) return false;
        var regexChars = {
            '-': true,
            '[': true,
            ']': true,
            '/': true,
            '{': true,
            '}': true,
            '(': true,
            ')': true,
            '*': true,
            '+': true,
            '?': true,
            '.': true,
            '\\': true,
            '^': true,
            '$': true,
            '|': true
        }
        var escaped = false;
        for(var i=0;i<str.length;i++){
            if(str[i] === '\\') escaped = !escaped;
            if(str[i+1] !== '\\' && regexChars[ str[i] ] && !escaped) return true;
        }
        return false;
    }

    function escapeRegExp(str) {
        return (str||'').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }

    function unEscapeRegExp(str) {
        return (str||'').replace(/\\(?!\\)/g,'');
    }

    var defaultType = 'string';

    var types = {
        string:{
            name:'string',
            operators: ['$regex_exact','$regex_contains','$regex_begins','$regex_ends','$in', // 'equal','contains','begins with','ends with','is in',
                        '$ne','$regex_ncontains','$regex_nbegins','$regex_nends','$nin','$regex'], // 'not equal','not contains','not begins with','not ends with','not in', 'regexp'
            template: templates.string
        },
        number:{
            name:'number',
            operators:['$eq','$lt','$lte','$gt','$gte'], // '=','<','<=','>','>='
            template: templates.number
        },
        boolean:{
            name:'boolean',
            operators:['$eq'], // 'is'
            template: templates.boolean,
            onBuild: function(value){ if([true,'true','True',1,'yes','Yes'].indexOf(value)!==-1) return true; else return false; }
        },
        date:{
            name:'date',
            operators:['$eq','$lt','$lte','$gt','$gte'], // '=','<','<=','>','>='
            template: templates.date
        },
        datetime:{
            name:'datetime',
            operators:['$eq','$lt','$lte','$gt','$gte'], // '=','<','<=','>','>='
            template: templates.datetime
        },
        object:{
            name:'object',
            operators:['$exists'],
            template: templates.boolean
        },
        array:{
            name:'array',
            operators:['$size'], // $elemMatch
            template: templates.string,
            templates:{
                '$size':templates.number,
                //'$elemMatch':templates.string
            }
        }
    };

    function buildSort(sortBy){
        if(!sortBy) return {};
        var query = this, s = {};
        s[querySortKey] = {};
        for(var i=0;i<sortBy.length;i++){
            s[querySortKey][ sortBy[i].key ] = sortBy[i].direction;
        }
        return s;
    }

    function parseSort(sortBy){
        var query = this, s = [];
        query.sortBy = []; // clean sort
        if(Object.prototype.toString.call(sortBy)==='[object Object]'){
            for(var key in sortBy){
                query.addSort();
                query.setSortByName(key, query.sortBy.length-1).direction = sortBy[key];
            }
        }
        return s;
    }

    function isKeyConflict(dest, src){
        if(['string','number','boolean'].indexOf(typeof dest) > -1) return true;
        if(src === null || src === undefined || typeof src === 'function') return false;

        // primitive type will cause override
        if(['string','number','boolean'].indexOf(typeof src) > -1) return true;
        else { // src is object
            for(var key in src){
                if(dest[key] !== undefined && dest[key] !== null) return true;
            }
        }
        return false;
    }

    function build(query, excludeSort){
        var result = {}, value;
        result = object.extend(true, result, query.options); // add query options to result

        // nested logical query, need to group ands
        if(query.length) {
            var andGroups = [], g=0;

            for(var i=0;i<query.length;i++){
                if(i>0 && query[i].logical==='OR') g++;
                andGroups[g] = andGroups[g] || [];
                andGroups[g].push(query[i]);
            }

            // no OR query, just ANDs
            if(g===0) {
                var presult,
                    wrappedByAnd = false,
                    andGroup = andGroups[g];

                for(var i=0;i<andGroup.length;i++){
                    presult = build(andGroup[i], true);

                    // check if there is key conflict:
                    // 1. no conflict scenario:  pkey:{ $lte:5 }, pkey:{ $gte:1 }
                    // 2. conflict scenario:  pkey:{ $regex:'5' }, pkey:{ $regex:'1' } or pkey:123, pkey:123
                    for(var pkey in presult){
                        if(result[ pkey ] !== undefined && result[ pkey ] !== null){
                            if(andGroup[i].field.merge) result = andGroup[i].field.merge(pkey, presult, result);
                            else if(!isKeyConflict(result[pkey], presult[pkey])){ // check keys conflicts
                                result[pkey] = object.extend(true, result[pkey], presult[pkey]);
                            }
                            else {
                                // key conflict, and field has no merge method, need to wrap it by AND
                                delete result[ pkey ]; // this field will be inside $and
                                result = queries['AND'].build(andGroup); // object.extend(true, {}, queries['AND'].build(andGroup));
                                wrappedByAnd = true;
                                break;
                            }
                        }
                        else result[pkey] = presult[pkey];
                    }

                    // don't continue if andGroup was wrapped by and
                    if(wrappedByAnd) break;
                }
            }
            // mixed ors and ands
            else result = object.extend(true, result, queries['OR'].build(andGroups));
        }
        // simple query
        else if(query.operator && query.field && query.field.key) {
            value = angular.copy(query.value);
            if(query.type.onBuild) value = query.type.onBuild(value);
            if(!query.field.isEmptyValue || !query.field.isEmptyValue(value)){
                value = queries[ query.operator ].build(typeof query.field.onBuild==='function' ? query.field.onBuild(value) : value);
                if(value!==undefined && value!==null) {
                    if(query.field.build) {
                        var customBuild = query.field.build(query.field.key, value, query); // custom field build
                        result[ customBuild.key || query.field.key] = customBuild.key ? customBuild.value : customBuild;
                    }
                    else result[query.field.key] = value;
                }
            }
        }

        // build sort
        if(!excludeSort) result = object.extend(true, result, buildSort.call(query, query.sortBy));

        return result;
    }

    function parse(builtQuery, parentLogical){
        var query = this, result, child;
        var keys = [];

        // filter reserved keys
        for(var key in builtQuery){
            if(['AND','OR','VALUE'].indexOf(key)!==-1) continue; // this are reserved keys for parsing

            if(key===querySortKey){
                parseSort.call(query, builtQuery[key]);
            }
            else if(!queries[key] && (key[0]===queryOptionKeyPrefix || queryOptionKeys.indexOf(key)!==-1)){
                // this is reserved key name
                query.options[key] = builtQuery[key];
            }
            else keys.push(key);
        }


        for(var k=0;k<keys.length;k++){
            key = keys[k];

            // check for custom fields parsers
            var customParser=null;
            for(var f=0;f<query.fields.length;f++){
                if((query.fields[f].field===key || (query.fields[f].match && key.match(query.fields[f].match))) && query.fields[f].parse){
                    customParser = query.fields[f].parse;
                    break;
                }
            }

            var modified = {};
            if(customParser) {
                modified = customParser(key, builtQuery[key], parentLogical);
                if(modified && modified.key) {
                    key = modified.key;
                    builtQuery[key] = modified.value;
                }
                else if(modified) builtQuery[key] = modified;

                if(Array.isArray(builtQuery[key])) {
                    for(var q in builtQuery[key]) {
                        parse.call(query, builtQuery[key][q].value, builtQuery[key][q].logical  || parentLogical);
                    }
                    continue;
                }
            }

            result = (queries[key] || queries.VALUE).parse(key, builtQuery[key]);

            // not recognized, continue
            if(!result) {
                if(modified.key) delete builtQuery[modified.key]; // - remove modified.key after parse
                continue;
            }

            // multiple operators in one key (e.g. range < >=), between have to be AND, but first
            else if(Array.isArray(result)){
                for(var i=0;i<result.length;i++) {
                    addQuery(query, result[i], (k===0 && i===0) ? parentLogical : 'AND');
                }
            }

            // AND, or OR queries
            else if(result.queries) {
                child = null;

                for(var i=0;i<result.queries.length;i++){
                    // if there is only one OR, or AND in query, no need to append child, just sibling
                    // if parent logical !== result logical, and it is first item inside logical group, its logical will be parent logical
                    // pseudo example 1: or[ and[1,2], or[1,2], and[1,2] ]
                    // pseudo example 2: and[ or[1,2], and[1,2], or[1,2] ]
                    // pseudo example 3: and[ or[1,2], or[1,2] ]
                    // pseudo example 4: or[ and[1,2], and[1,2] ]
                    if(keys.length===1 && !parentLogical) query.parse(result.queries[i], i===0 && parentLogical ? parentLogical : result.logical);

                    // if mixed ANDs or ORs with other keys, create one child and then append to it all remaining queries
                    else if(child) child.parse(result.queries[i], result.logical);
                    else {
                        child = query.append(parentLogical);
                        child.parse(result.queries[i], result.logical);
                    }
                }
            }

            // direct value query, only first will have parentlogical, next has 'AND'
            else if(k===0) addQuery(query, result, parentLogical);
            else addQuery(query, result, 'AND');

            if(modified.key) delete builtQuery[modified.key]; // - remove modified.key after parse
        }

        function addQuery(query, result, logical){
            child = query.append(logical);
            child.type = types[result.typeName];
            child.value = result.value;
            child.setFieldByName(result.fieldName, true); // reset if defined, because default field (first) was already set
            child.resolveValueNames();
            child.operator = result.operator; // force change operator to show original query operator, even if field has disabled changing operator
        }

        return query;
    }

    // date parse regex
    var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
    function parseValueType(value){
        var type, match, milliseconds;

        if(typeof value==='boolean') type = 'boolean';
        else if(typeof value==='number') type = 'number';
        else if(value instanceof Date) {
            if(value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0 && value.getMilliseconds() === 0) type = 'date';
            else type = 'datetime';
        }
        else if(typeof value==='string') {
            match = value.match(regexIso8601);
            if(match) milliseconds = Date.parse(match[0]);
            if (!isNaN(milliseconds)) {
                value = new Date(milliseconds);
                if(value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0 && value.getMilliseconds() === 0) type = 'date';
                else type = 'datetime';
            }
            else type = 'string';
        }
        //else if(Array.isArray(value)) type = 'array';
        //else if(Object.prototype.toString.call(value)==='[object Object]') type = 'object';

        return {
            type:type,
            value:value
        };
    }


    var queries = {
        AND:{ // called on build when AND operator
            build: function(value){
                var $and = [], andVal;
                for(var i=0;i<(value.length||0);i++){
                    andVal = build(value[i], true);
                    if(Object.keys(andVal).length) $and.push(andVal);
                }
                return $and.length ? { $and: $and } : {};
            }
        },
        OR:{ // called on build when OR operator
            build: function(value){
                var $or = [], orVal;
                for(var i=0;i<(value.length||0);i++){
                    orVal = build(value[i], true);
                    if(Object.keys(orVal).length) $or.push(orVal);
                }
                return $or.length ? { $or: $or } : {};
            }
        },
        VALUE:{ // if parsed query value is not recognized object, this will be called
            parse: function(key, value){
                var siblings = [], sibling;
                var vt = parseValueType(value), type = vt.type;
                value = vt.value;

                if(Object.prototype.toString.call(value)==='[object Object]'){
                    for(var prop in value){
                        sibling = (queries[prop] || queries.VALUE).parse(key, value[prop]);
                        if(sibling) siblings.push(sibling);
                    }
                    return siblings;
                }

                if(type) return {
                    fieldName: key,
                    typeName: type,
                    operator: type==='string' ? '$regex_exact' : '$eq',
                    value: value
                };
            }
        },
        $and:{
            parse: function(key, value){
                // key = null (if root), or 0,1,2 (if inside other logical operator)
                // value = [ {subquery}, {subquery} ]
                if(!Array.isArray(value)) return null;
                return {
                    logical: 'AND',
                    queries: value
                };
            }
        },
        $or:{
            parse: function(key, value){
                // key = null (if root), or 0,1,2 (if inside other logical operator)
                // value = [ {subquery}, {subquery} ]
                if(!Array.isArray(value)) return null;
                return {
                    logical: 'OR',
                    queries: value
                };
            }
        },
        $eq:{
            build: function(value){
                return value;
            },
            parse: function(key, value){
                var vt = parseValueType(value), type = vt.type;
                value = vt.value;

                if(type) return {
                    fieldName: key,
                    typeName: type,
                    operator: type==='string' ? '$regex_exact' : '$eq',
                    value: value
                };
            }
        },
        $exists:{
            build: function(value){
                return { $exists: value };
            },
            parse: function(key, value){
                // value = true / false
                if(typeof value==='boolean') return {
                    fieldName: key,
                    typeName: 'object',
                    operator: '$exists',
                    value: value
                };
            }
        },
        $size:{
            build: function(value){
                return { $size: value };
            },
            parse: function(key, value){
                // value = true / false
                if(typeof value==='number') return {
                    fieldName: key,
                    typeName: 'array',
                    operator: '$size',
                    value: value
                };
            }
        },
        $lt:{
            build: function(value){ return { $lt: value }; },
            parse: function(key, value){
                var vt = parseValueType(value), type = vt.type;
                value = vt.value;

                if(type==='number' || type==='date' || type==='datetime') return {
                    fieldName: key,
                    typeName: type,
                    operator: '$lt',
                    value: value
                };
            }
        },
        $lte:{
            build: function(value){ return { $lte: value }; },
            parse: function(key, value){
                var vt = parseValueType(value), type = vt.type;
                value = vt.value;

                if(type==='number' || type==='date' || type==='datetime') return {
                    fieldName: key,
                    typeName: type,
                    operator: '$lte',
                    value: value
                };
            }
        },
        $gt:{
            build: function(value){ return { $gt: value }; },
            parse: function(key, value){
                var vt = parseValueType(value), type = vt.type;
                value = vt.value;

                if(type==='number' || type==='date' || type==='datetime') return {
                    fieldName: key,
                    typeName: type,
                    operator: '$gt',
                    value: value
                };
            }
        },
        $gte:{
            build: function(value){ return { $gte: value }; },
            parse: function(key, value){
                var vt = parseValueType(value), type = vt.type;
                value = vt.value;

                if(type==='number' || type==='date' || type==='datetime') return {
                    fieldName: key,
                    typeName: type,
                    operator: '$gte',
                    value: value
                };
            }
        },
        $regex:{
            build: function(value){ 
                if(queryConfig.useRegexBracketsWrap) value = '(' + value + ')';
                return { 
                    $regex: value
                };
            },
            parse: function(key, value){
                var operator, op, match;

                if(queryConfig.useRegexBracketsWrap && typeof value === 'string' && value[0] === '(' && value[ value.length-1 ] === ')'){
                    value = value.slice(1, value.length - 1);
                }
                else for(var i=0;i<types.string.operators.length;i++){
                    op = types.string.operators[i];
                    if(queries[op] && queries[op].check && (match = queries[op].check(value)) !== undefined) {
                        operator = op;
                        value = match;
                        break;
                    }
                }

                return {
                    fieldName: key,
                    typeName: 'string',
                    operator: operator || '$regex',
                    value: value
                };
            }
        },
        $regex_exact:{ // fake regex shortcut - this means simple equal
            build: function(value){
                return value;
            }
        },
        $regex_contains:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value); //.replace(/^\//,'').replace(/\/[gimy]*$/,'');
                return { $regex: '.*' +value+ '.*' };
            },
            check: function(value){
                value = ( value.match(/^\.\*(.*)\.\*$/ ) || [] )[1];
                if( isRegexString(value) ) return undefined;
                return value === undefined ? undefined : unEscapeRegExp(value);
            }
        },
        $regex_ncontains:{ // regex shortcut
            build: function(value){
                value = value = escapeRegExp(value);
                return { $regex: '^((?!' +value+ ').)*$' };
            },
            check: function(value){
                value = (value.match(/^\^\(\(\?\!(.*)\)\.\)\*\$$/) || [])[1];
                if( isRegexString(value) ) return undefined;
                return value === undefined ? undefined : unEscapeRegExp(value);
            }
        },
        $regex_begins:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value);
                return { $regex: '^' +value+ '.*' };
            },
            check: function(value){
                value = (value.match(/^\^(.*)\.\*$/) || [])[1];
                if( isRegexString(value) ) return undefined;
                return value === undefined ? undefined : unEscapeRegExp(value);
            }
        },
        $regex_nbegins:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value);
                return { $regex: '^(?!' +value+ ').*$' };
            },
            check: function(value){
                value = (value.match(/^\^\(\?\!(.*)\)\.\*\$$/) || [])[1];
                if( isRegexString(value) ) return undefined;
                return value === undefined ? undefined : unEscapeRegExp(value);
            }
        },
        $regex_ends:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value);
                return { $regex: '.*' +value+ '$' };
            },
            check: function(value){
                value = (value.match(/^\.\*(.*)\$$/) || [])[1];
                if( isRegexString(value) ) return undefined;
                return value === undefined ? undefined : unEscapeRegExp(value);
            }
        },
        $regex_nends:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value);
                return { $regex: '^(?!.*' +value+ '$)' };
            },
            check: function(value){
                value = (value.match(/^\^\(\?\!\.\*(.*)\$\)$/) || [])[1];
                if( isRegexString(value) ) return undefined;
                return value === undefined ? undefined : unEscapeRegExp(value);
            }
        },
        $ne:{
            build: function(value){ return { $ne: value }; },
            parse: function(key, value){
                var vt = parseValueType(value), type = vt.type;
                value = vt.value;

                if(type) return {
                    fieldName: key,
                    typeName: type,
                    operator: '$ne',
                    value: value
                };
            }
        },
        $in:{
            build: function(value){
                if(typeof value==='string'){
                    value = value.replace(/,\s+/g,',') // replace whitespace before commas
                                 .replace(/\s+,/g,',') // replace whitespace after commas
                                 .replace(/^,/,'') // replace comma in begin of string
                                 .replace(/,$/,'') // replace comma in end of string
                                 .split(',');
                }
                return { $in: value };
            },
            parse: function(key, value){
                if(Array.isArray(value)) return {
                    fieldName: key,
                    typeName: 'string',
                    operator: '$in',
                    value: value.join(', ')
                };
            }
        },
        $nin:{
            build: function(value){
                if(typeof value==='string'){
                    value = value.replace(/,\s+/g,',') // replace whitespace before commas
                                 .replace(/\s+,/g,',') // replace whitespace after commas
                                 .replace(/^,/,'') // replace comma in begin of string
                                 .replace(/,$/,'') // replace comma in end of string
                                 .split(',');
                }
                return { $nin: value };
            },
            parse: function(key, value){
                if(Array.isArray(value)) return {
                    fieldName: key,
                    typeName: 'string',
                    operator: '$nin',
                    value: value.join(', ')
                };
            }
        }
    };

    //var exampleQuery = [ //.OR=true
    //    'field operator value',
    //    [ //.AND=true
    //        [
    //            'field operator value',
    //            'field operator value',
    //            [ //.AND=true
    //                'field operator value'
    //            ]
    //        ],
    //        // AND
    //        'field operator value'
    //    ]
    //]


    function newQuery(logical){
        var q = [];

        q.options = {}; // additional query options
        q.sortBy = [];
        q.build = function(excludeSort){ return build.call(this, this, excludeSort); };
        q.parse = function(builtQuery, logical){ return parse.call(this, builtQuery, logical); };
        q.fill = function(builtQuery){
            this.splice(0, this.length); // clear array
            this.parse(builtQuery); // start with first child
            if((!this.parent || !this.parent()) && this.length===0) this.append('AND'); // if this is root query and there is no child, add one
            if(q.runValueNameResolver) q.runValueNameResolver();
            if(q.onFill) q.onFill();
            return q;
        };
        q.isEmpty = isEmpty; // is both, sort and query empty
        q.isQueryEmpty = isQueryEmpty;
        q.isSortEmpty = isSortEmpty;
        q.isDirty = isDirty;
        q.setDirty = setDirty;
        q.clear = clear;
        q.newQuery = newQuery;
        q.templates = templates;
        q.fields = this.fields; // inherit fields
        q.types = this.types; // inherit types
        q.onlyPredefinedFields = this.onlyPredefinedFields; // inherit onlyPredefinedFields
        q.logical = logical || 'AND'; // default logical is AND
        q.append = append;
        q.next = next;
        q.levelDown = levelDown;
        q.remove = remove;
        q.reset = reset;
        q.setFieldByName = setFieldByName;
        q.resolveValueNames = resolveValueNames;
        q.setField = setField;
        q.setOperator = setOperator;
        q.setType = setType;
        q.addSort = addSort;
        q.removeSort = removeSort;
        q.toggleSortDirection = toggleSortDirection;
        q.setSortByName = setSortByName;
        q.setSortField = setSortField;

        var parent;
        q.root = q.getRoot = function(){ return parent ? parent.getRoot() : q; };
        q.parent = q.getParent = function(){ return parent; };
        q.setParent = function(newParent){ parent = newParent; };

        // sometimes, it is better to resolve all names by one BE call, so q.resolveAllValueNames is called instead of field.resolveValueNames
        if(!parent) q.runValueNameResolver = function(){
            var q = this;
            var fieldValsToResolve = {}; // field.key:{ valueNames }
            var needsToResolveSomeField = false;
            var fieldsByKey = {};

            q.fields.forEach(function(field){
                var valsToResolve = {};

                // cache fields by key, if someone wants to use other field props than key
                fieldsByKey[ field.key ] = field;

                if(field.valueNames) {
                    for(var val in field.valueNames) {
                        if(field.valueNames[val] === null || field.valueNames[val] === undefined) {
                            valsToResolve[ val ] = null;
                        }
                    }
                    fieldValsToResolve[field.key] = valsToResolve;

                    if(!Object.keys(valsToResolve).length) delete fieldValsToResolve[field.key];
                    else if(field.resolveValueNames) field.resolveValueNames(valsToResolve, function(resolvedValNames){
                        resolvedValNames = resolvedValNames || {};
                        for(var val in resolvedValNames) field.valueNames[val] = resolvedValNames[val];
                    });
                }
            });

            if(q.resolveAllValueNames && Object.keys(fieldValsToResolve).length) {
                q.resolveAllValueNames(fieldValsToResolve, fieldsByKey, function(resolvedFieldVals){
                    q.fields.forEach(function(field){
                        if(resolvedFieldVals[ field.key ]) object.merge(field.valueNames, resolvedFieldVals[ field.key ]);
                    });
                });
            }
        };

        // set initial query state
        q.reset();

        return q;
    }

    function append(logical){
        var q = this.newQuery(logical);
        // make reference to parent non enumerable to prevent stack overflow when merging (it is circular reference)
        q.setParent(this);
        this.push(q);
        return q;
    }

    function levelDown(logical){
        var self = this;
        if(!self.parent()) return;

        // if this is only child of parent disable levelDovn
        if(self.parent().length<=1) return;

        var index = self.parent().indexOf(self);
        var wrapper = self.next(self.logical);
        self.parent().splice(index, 1); // remove element from parent
        self.logical = 'AND'; // default logical if first element
        self.setParent(wrapper); // now, parent is wrapper
        wrapper.push(self); // append element to wrapper

        return wrapper;
    }

    function next(logical){
        var self = this;
        if(!self.parent()) return;

        var index = self.parent().indexOf(self);
        var q = this.newQuery(logical);
        q.setParent(self.parent());

        self.parent().splice(index+1,0,q);
        return q;
    }

    function remove(){
        var self = this;
        if(!self.parent()) return;

        // don't remove last root element, just reset field
        if(!self.parent().parent() && self.parent().length===1) return self.reset();

        // if removing last child of element, remove also element
        if(self.parent().length===1) return self.parent().remove();

        var index = self.parent().indexOf(self);
        self.parent().splice(index,1);
        self = null;
    }

    function reset(){
        var q = this;
        if(q.fields.length) { // default field is first when there are some
            q.field = q.fields[0];
            q.type = types[ q.field.type ];
            if(!q.type) throw new Error('Field type "' +q.field.type+ '" not recognized, please choose one from "' +Object.keys(types).join(', ')+ '"');
            q.fieldName = q.field.name;
            q.operator = q.type.operators[ q.field.operatorIndex||0 ];
        }
        else {
            q.field = q.field || {};
            q.type = types[ q.type || q.types[0] ];
            q.operator = q.type.operators[0];
        }
        q.value = null;
    }

    function clear(){
        this.splice(0, this.length); // clear array
        this.setDirty(false);
        return this;
    }

    function isEmpty(builtQuery){
        builtQuery = builtQuery || this.build();
        return this.isQueryEmpty(builtQuery) && this.isSortEmpty(builtQuery);
    }

    function isQueryEmpty(builtQuery){
        builtQuery = builtQuery || this.build();
        var keysLength = Object.keys(builtQuery).length;
        return keysLength === 0 || (keysLength === 1 && builtQuery.hasOwnProperty('$sort'));
    }

    function isSortEmpty(builtQuery){
        builtQuery = builtQuery || this.build();
        return Object.keys(builtQuery.$sort||{}).length === 0;
    }

    function setDirty(isDirty){
        this.$dirty = isDirty = false ? false : true;
        this.$touched = isDirty = false ? false : true;
        return this;
    }

    function isDirty(){
        return this.$dirty;
    }

    function setFieldByName(fieldName, resetPrevField){
        if(resetPrevField) delete this.field;

        if(fieldName){
            var fieldNameLower = fieldName.toLowerCase();
            for(var i=0;i<this.fields.length;i++){
                if(this.fields[i].key===fieldName || this.fields[i].nameLower===fieldNameLower){
                    return this.setField(this.fields[i]); // match with predefined fields
                }
                else if(this.fields[i].match && (fieldName.match(this.fields[i].match) || fieldNameLower.match(this.fields[i].match))){
                    if(this.field && this.field.field === this.fields[i].field) return;
                    else return this.setField(this.fields[i], fieldName); // match with predefined fields
                }
            }
        }
        this.fieldName = fieldName;
        this.field = { key:fieldName };
    }

    function resolveValueNames() {
        var q = this;

        var root = q.getRoot();
        var rootField = root.fields.filter(function(field){
            return field.key === (q.field || {}).key;
        })[0];

        if(!rootField) return;
        rootField.valueNames = rootField.valueNames || {};

        // set suggestion getter for refreshing purposes
        Object.defineProperty(q, 'suggestion', {
            get: function() { return rootField.valueNames[ q.value ] || q.value; },
            set: function(name) { rootField.valueNames[ q.value ] = name; },
        });

        if(rootField.valueNames[ q.value ]) return; // already resolved
        else if(q.field.resolveValueName) { // single value resolve
            q.field.resolveValueName(q.value, function(valueName){
                if(typeof valueName === 'string') {
                    q.suggestion = valueName;
                    rootField.valueNames[ q.value ] = valueName;
                }
                else {
                    if(!Array.isArray(valueName)) valueName = [valueName];
                    for(var i=0;i<valueName.length;i++){
                        if(valueName[i].key === q.value) {
                            q.suggestion = valueName[i].name;
                            rootField.valueNames[ q.value ] = valueName[i].name;
                            return;
                        }
                    }
                }
            });
        }
        else { // all value names resolve
            // register another value which need to be resolved
            rootField.valueNames[ q.value ] = null;
        }
    }

    function setField(field, fieldName){
        // field type changed, reset value
        if(this.type.name !== field.type){
            this.type = types[ field.type ];
            if(!this.type) throw new Error('Field type "' +field.type+ '" not recognized, please choose one from "' +Object.keys(types).join(', ')+ '"');
            // this.operator = this.type.operators[0];
            this.value = null;
        }
        var prevField = this.field;
        this.field = angular.copy(field||{});
        this.fieldName = fieldName || this.field.name;

        // set default operator, if field has operatorIndex
        this.operator = this.type.operators[ this.field.operatorIndex||0 ];
        if(field.onSet) field.onSet(this, prevField);
    }

    function setOperator(operator){
        if(this.type.templates && this.type.templates[this.operator] !== this.type.templates[operator]) this.value = null;
        this.operator = operator;
    }

    function setType(type){
        this.type = types[ type ];
        this.operator = this.type.operators[0];
        this.value = null; // clear value because of operator changed
    }

    function addSort(index){
        var s = {};
        if(this.fields.length){
            s.fieldName = this.fields[0].name;
            s.name = this.fields[0].name;
            s.key = this.fields[0].key;
            s.direction = 1;
        }
        if(!isNaN(index)) this.sortBy.splice(index+1,0,s);
        else this.sortBy.push(s);
    }

    function removeSort(index){
        this.sortBy.splice((!isNaN(index) ? index : this.sortBy.length-1),1);
    }

    function toggleSortDirection(index){
        index = index || 0;
        this.sortBy[index].direction = this.sortBy[index].direction===1 ? -1 : 1;
    }

    function setSortByName(fieldName, index){
        index = index || 0;
        if(fieldName){
            var fieldNameLower = fieldName.toLowerCase();
            for(var i=0;i<this.fields.length;i++){
                if(this.fields[i].key===fieldName || this.fields[i].nameLower===fieldNameLower){
                    // match with predefined fields
                    this.sortBy[index].fieldName = this.fields[i].name;
                    this.sortBy[index].name = this.fields[i].name;
                    this.sortBy[index].key = this.fields[i].key;
                    return this.sortBy[index];
                }
            }
        }
        this.sortBy[index].fieldName = fieldName;
        this.sortBy[index].key = fieldName;
        return this.sortBy[index];
    }

    function setSortField(field, index){
        index = index || 0;
        this.sortBy[index].fieldName = field.name;
        this.sortBy[index].name = field.name;
        this.sortBy[index].key = field.key;
    }

    function filterByName(fieldName, currentFieldName){
        var result = [], fields = this, fieldNameLower = (fieldName || '').toLowerCase();
        if(!fieldName || fieldName===currentFieldName) return fields;

        for(var i=0;i<fields.length;i++){
            if(fields[i].nameLower && fields[i].nameLower.match( new RegExp('.*' +fieldNameLower+ '.*')))
                result.push(fields[i]);
        }
        return result;
    }

    // field behaviour usage: behaviour:'keyValueArray',
    // or behaviour:{ keyValueArray:{ prefix:'variants.', idKey:'id', valueKey:'value' } }

    var fieldBehaviours = {
        keyValueArray: function(opts){
            var field = this;
            var propName = field.field;
            var keyPrefix = opts.prefix || opts.keyPrefix || '';
            var idKey = opts.key || opts.idKey;
            var valueKey = opts.value || opts.valueKey;
            if(!idKey || !valueKey) throw new Error('neQuery: Cannot set field behaviour, "idKey" or "valueKey" not defined');

            return {
                match: new RegExp(propName+'.*'),
                build:function(key, expression, query){
                    var $elemMatch = {};
                    $elemMatch[idKey] = query.fieldName.replace(propName+'.','');
                    $elemMatch[valueKey] = expression;
                    return {
                        key: keyPrefix+propName,
                        value:{
                            $elemMatch:$elemMatch
                        }
                    }
                },
                merge: function(key, toMerge, merged){
                    if(toMerge[key].$elemMatch){
                        if(merged[key].$all) {
                            merged[key].$all.push(toMerge[key]);
                        }
                        else merged[key] = {
                            $all:[
                                merged[key],
                                toMerge[key]
                            ]
                        };
                    }

                    return merged;
                },
                parse: function(key, value, parentLogical){
                    // $elemMatch:{ id:'asdasd', value:'asdasd' }
                    if(value.$elemMatch){
                        var fieldName = key + '.' + value.$elemMatch[ idKey ];

                        return {
                            key: fieldName.replace(keyPrefix,''),
                            value: value.$elemMatch[ valueKey ]
                        };
                    }
                    else if(Array.isArray(value.$all)){
                        var result = [];
                        for(var i=0;i<value.$all.length;i++){
                            if(value.$all[i].$elemMatch){
                                result[i] = {
                                    value: {},
                                    logical: i>0 ? 'AND' : parentLogical
                                };
                                result[i].value[ propName+'.'+value.$all[i].$elemMatch[ idKey ] ] = value.$all[i].$elemMatch[ valueKey ];
                            }
                        }
                        return result;
                    }
                }
            };
        }
    };

    function Query(name, fields){ // Query(opts)
        var opts = {};
        if(arguments.length===1){
            if(Array.isArray(arguments[0])){
                fields = arguments[0];
                name = null;
            }
            else if(angular.isObject(arguments[0])) {
                opts = arguments[0];
                fields = opts.fields;
                name = opts.name;
            }
        }

        fields = fields || [];
        for(var i=0;i<fields.length;i++){
            fields[i].key = fields[i].key || fields[i].field || fields[i].property;
            fields[i].name = local.translate(fields[i].name || fields[i].key);
            fields[i].nameLower = (fields[i].name || '').toLowerCase();

            if(fields[i].behaviour){ // init behaviour = copy merge, parse, build methods
                var behName=null, behOpts={}, behFnc=null;
                if(typeof fields[i].behaviour === 'string') behName = fields[i].behaviour;
                else {
                    behName = Object.keys(fields[i].behaviour)[0];
                    behOpts = fields[i].behaviour[ behName ];
                }

                var beh = fieldBehaviours[ behName ];
                if(beh){
                    var bMethods = beh.call(fields[i], behOpts);
                    for(var bkey in bMethods){
                        fields[i][bkey] = bMethods[ bkey ];
                    }
                }
            }

            // if type is set, disable changing type
            if(fields[i].type) fields[i].disableType = true;
            fields[i].type = fields[i].type || fields[i].defaultType || defaultType; // set default type if field has no type

            // config can disable some operators
            fields[i].allowedOperatorIndexes = fields[i].allowedOperatorIndexes;

            // if operator is set, disable changing operator
            if(fields[i].operatorIndex >= 0) fields[i].disableOperator = true;
            fields[i].operatorIndex = fields[i].operatorIndex || fields[i].defaultOperatorIndex;

            // set list template if values are set, but template not
            if(fields[i].values && !fields[i].template) fields[i].template = templates.list;

            // config can define emptyValues - values which can be valid but considered as empty, e.g. empty string, zero, etc...
            fields[i].emptyValues = fields[i].emptyValues || fields[i].ignoreValues;
            fields[i].isEmptyValue = fields[i].isEmptyValue || function(value){
                if(value===null || value===undefined) return true;
                return (this.emptyValues||this.type.emptyValues) ? (this.emptyValues||this.type.emptyValues).indexOf(value) > -1 : false;
            };

            // wrap load suggestions method
            fields[i].loadSuggestions = fields[i].loadSuggestions || fields[i].getSuggestions || fields[i].suggestions;
            fields[i].onlySuggestedValues = fields[i].onlySuggestedValues;

            if(fields[i].loadSuggestions) {
                fields[i].resetOnFieldChange = true;
                fields[i].onSet = fields[i].onSet || function(query, prevField){
                    if(prevField){
                        query.value = null;
                        query.suggestion = '';
                        query.suggestions = [];
                    }
                    else query.suggestion = query.suggestion || query.value;
                };
                fields[i].template = fields[i].template || templates.suggestions;
                fields[i].createSuggestions = (function(field){
                    field.suggestionMinLength = field.suggestionMinLength >= 0 ? field.suggestionMinLength : (field.suggestionMinSearchLength >= 0 ? field.suggestionMinSearchLength : 3);
                    
                    var loadSuggestionsDebounced = object.debounce(loadSuggestions, field.suggestionDebounce >= 0 ? field.suggestionDebounce : 350);

                    function loadSuggestions(query, searchText){
                        searchText = searchText || '';
                        query.page = query.page || field.page || 1;
                        query.limit = query.limit || field.limit || 10;
                        if(searchText.length >= field.suggestionMinLength) field.loadSuggestions.call(query, searchText, function(values, pagination){
                            query.suggestions = values.map(function(value) {
                                return {
                                    key: value.key || value,
                                    name: value.name || value.key || value
                                };
                            });
                            query.pagination = pagination;
                            query.page = pagination.page || query.page;
                            query.limit = pagination.limit || query.limit;
                        });
                    }
                    
                    return function(query, searchText, debounce){
                        if(debounce) return loadSuggestionsDebounced(query, searchText);
                        else return loadSuggestions(query, searchText);
                    };
                })(fields[i]);
            }
        }
        fields.filterByName = filterByName;

        var q = newQuery.call({ fields:fields, types:Object.keys(types) },'AND'); // default logical is AND
        q.name = name;
        q.onlyPredefinedFields = opts.onlyPredefinedFields;

        q.append('AND');

        return q;
    }

    Query.templates = templates;
    Query.fieldBehaviours = fieldBehaviours;

    return Query;
}])
.factory('neQueryTests', ['NeQuery','neObject', function(Query, object){

    return function(){

        var q = new Query();

        function testQuery(name, inputQuery, compareQuery){
            var builtQuery = q.fill(inputQuery).build();
            var isEqual = object.deepEqual(compareQuery || inputQuery, builtQuery, function(key){
                return key==='$sort';
            });
            if(!isEqual) console.warn('Query test failed "' +name+ '", input query do not match built one', compareQuery || inputQuery, builtQuery);
            else console.log('Query test "' +name+ '" - OK');
        }

        /*
         * simple queries
         */
        testQuery('simple range query', { field1:{ $gte:1, $lte:2 } });
        testQuery('simple and[1,2]', { field1:'value1', field2:'value2' });
        testQuery('simple and[1,2] with $and operator', { $and:[{field1:'value1'}, {field2:'value2'} ] }, { field1:'value1', field2:'value2' });
        testQuery('simple or[1,2] with $or operator', { $or:[{field1:'value1'}, {field2:'value2'} ] });

        /*
         * nested queries
         */

        // or[ and[1,2], or[1,2], and[1,2] ]
        testQuery('or[ and[1,2], or[1,2], and[1,2] ]', {
            $and:[
                {
                    $or:[
                        { field1_or1: 'value1_or1' },
                        { field2_or1: 'value2_or1' }
                    ]
                },
                {
                    $or:[
                        { field1_or2: 'value1_or2' },
                        { field2_or2: 'value2_or2' }
                    ]
                }
            ]
        });

        // or[ or[1,2], and[1,2], or[1,2] ]
        testQuery('or[ or[1,2], and[1,2], or[1,2] ]', {
            $or:[
                {
                    $or:[
                        { field1_or1: 'value1_or1' },
                        { field2_or1: 'value2_or1' }
                    ]
                },
                {
                    $and:[
                        { field1_and1: 'value1_and1' },
                        { field2_and1: 'value2_and1' }
                    ]
                },
                {
                    $or:[
                        { field1_or2: 'value1_or2' },
                        { field2_or2: 'value2_or2' }
                    ]
                }
            ]
        },{
            $or:[
                {
                    $or:[
                        { field1_or1: 'value1_or1' },
                        { field2_or1: 'value2_or1' }
                    ]
                },
                {
                    field1_and1: 'value1_and1',
                    field2_and1: 'value2_and1'
                },
                {
                    $or:[
                        { field1_or2: 'value1_or2' },
                        { field2_or2: 'value2_or2' }
                    ]
                }
            ]
        });

        // and[ or[1,2], and[1,2], or[1,2] ]
        testQuery('and[ or[1,2], and[1,2], or[1,2] ]', {
            $and:[
                {
                    $or:[
                        { field1_or1: 'value1_or1' },
                        { field2_or1: 'value2_or1' }
                    ]
                },
                {
                    $and:[
                        { field1_and1: 'value1_and1' },
                        { field2_and1: 'value2_and1' }
                    ]
                },
                {
                    $or:[
                        { field1_or2: 'value1_or2' },
                        { field2_or2: 'value2_or2' }
                    ]
                }
            ]
        },{
            $and:[
                {
                    $or:[
                        { field1_or1: 'value1_or1' },
                        { field2_or1: 'value2_or1' }
                    ]
                },
                {
                    field1_and1: 'value1_and1',
                    field2_and1: 'value2_and1'
                },
                {
                    $or:[
                        { field1_or2: 'value1_or2' },
                        { field2_or2: 'value2_or2' }
                    ]
                }
            ]
        });

        // and[ or[1,2], or[1,2] ]
        testQuery('and[ or[1,2], or[1,2] ]', {
            $and:[
                {
                    $or:[
                        { field1_or1: 'value1_or1' },
                        { field2_or1: 'value2_or1' }
                    ]
                },
                {
                    $or:[
                        { field1_or2: 'value1_or2' },
                        { field2_or2: 'value2_or2' }
                    ]
                }
            ]
        });

        // or[ and[1,2], and[1,2] ]
        testQuery('or[ and[1,2], and[1,2] ]', {
            $or:[
                {
                    $and:[
                        { field1_and1: 'value1_and1' },
                        { field2_and1: 'value2_and1' }
                    ]
                },
                {
                    $and:[
                        { field1_and2: 'value1_and2' },
                        { field2_and2: 'value2_and2' }
                    ]
                }
            ]
        },{
            $or:[
                { field1_and1: 'value1_and1', field2_and1: 'value2_and1' },
                { field1_and2: 'value1_and2', field2_and2: 'value2_and2' }
            ]
        });

        /*
         * nested, nested with ragne queries
         */

        // or[ or[1,range], and[range,1,2, or[1,2] ], or[range,range] ]
        testQuery('or[ or[1,range], and[range,1,2], or[range,range] ]', {
            $or:[
                {
                    $or:[
                        { field1_or1: 'value1_or1' },
                        { field2_or1: { $gt:1, $lt:100 } }
                    ]
                },
                {
                    $and:[
                        { field1_and1: { $gt:1, $lt:100 } },
                        { field1_and1: 'value1_and1' },
                        { field2_and1: 'value2_and1' },
                        {
                            $or:[
                                { field1_and1_or: { $gte:1, $lte:100 } },
                                { field2_and1_or: 'value2_and1_or' }
                            ]
                        }
                    ]
                },
                {
                    $or:[
                        { field1_or2: { $gte:1, $lte:100 } },
                        { field2_or2: { $gte:1, $lte:100 } }
                    ]
                }
            ]
        },{
            $or:[
                {
                    $or:[
                        { field1_or1: 'value1_or1' },
                        { field2_or1: { $gt:1, $lt:100 } }
                    ]
                },
                {
                    $and:[
                        { field1_and1: { $gt:1 } },
                        { field1_and1: { $lt:100 } },
                        { field1_and1: 'value1_and1' },
                        { field2_and1: 'value2_and1' },
                        {
                            $or:[
                                { field1_and1_or: { $gte:1, $lte:100 } },
                                { field2_and1_or: 'value2_and1_or' }
                            ]
                        }
                    ]
                },
                {
                    $or:[
                        { field1_or2: { $gte:1, $lte:100 } },
                        { field2_or2: { $gte:1, $lte:100 } }
                    ]
                }
            ]
        });
    };
}]);
