
/**
 *                                                  NE GRID
 * ***************************************************************************************************************************
 */

/*
 * GRID Constructor
 *
 * Usage:
 * var myGrid = new Grid({
 *      id: 'products',
 *      restResource: products,
 *      loadOnChange:true,
 *      limit:20
 * });
 *
 */


angular.module('neGrid',['neObject','neLocal'])
.run(['$templateCache', function($templateCache) {
    $templateCache.put('neGrid/pagination.html',
        '<div ng-if="!paginationDisabled" class="row text-{{fontSize}}">' +
        '    <div class="col-xs-12 col-sm-9 col-md-10 text-center">' +
        '        <div class="btn-group btn-group-{{size}}">'+
        '           <button class="btn btn-default" ng-disabled="grid.prevDisabled" ng-click="grid.setPage(\'first\')"><span class="fa fa-fast-backward"></span></button>' +
        '           <button class="btn btn-default" ng-disabled="grid.prevDisabled" ng-click="grid.setPage(\'prev\')"><span class="fa fa-backward"></span></button>' +
        '        </div>'+
        '        <span>'+
        '           <span ng-if="grid.pagesCount"> {{\'page\'|translate}} </span>' +
        '           <input type="number" class="input-{{size}} width-sm" ng-model="grid.pagination.page" min="1" max="{{grid.pagination.pages||\'\'}}" ne-keypress-enter="grid.setPage(grid.pagination.page)">' +
        '           <span ng-if="grid.pagesCount"> {{\'of\'|translate}} {{grid.pagesCount}} </span>' +
        '           <span ng-if="grid.pagesCount" class="hidden-xs">({{grid.pagination.count}} {{\'items\'|translate}})</span>'+
        '        </span>' +
        '        <div class="btn-group btn-group-{{size}}">'+
        '           <button class="btn btn-default" ng-disabled="grid.nextDisabled" ng-click="grid.setPage(\'next\')"><span class="fa fa-forward"></span></button>' +
        '           <button class="btn btn-default" ng-disabled="grid.nextDisabled || !grid.pagesCount" ng-click="grid.setPage(\'last\')"><span class="fa fa-fast-forward"></span></button>' +
        '        </div>' +
        '    </div>' +
        '    <div class="col-sm-3 col-md-2 text-right hidden-xs">' +
        '        <div class="input-group">'+
        '           <input class="input-{{size}} width-sm" type="number" ng-model="grid.limit" ne-keypress-enter="grid.setPage(\'first\')" min="1" max="{{grid.maxLimit}}">' +
        '           <span class="input-group-btn">' +
        '               <button class="btn btn-default btn-{{size}}" ng-click="grid.setPage(\'first\')"><span class="fa fa-refresh"></span></button>' +
        '           </span>' +
        '        </div>' +
        '    </div>' +
        '</div>');
}])
.directive('neGridPagination', [function(){
    return {
        templateUrl:'neGrid/pagination.html',
        scope:{ grid:'=neGridPagination' },
        link: function(scope, elm, attrs){
            scope.size = attrs.neGridPaginationSize || 'sm';
            scope.fontSize = 'base';
            if(scope.size === 'xs') scope.fontSize = 'sm';
            if(scope.size === 'lg') scope.fontSize = 'lg';
        }
    };
}])
.directive('neGridUpdateBlur', ['$timeout','neObject', function($timeout, object){
    return {
        restrict: 'A', // only activate on element attribute
        require: '?ngModel', // get a hold of NgModelController
        //scope:{ blurUpdate:'=' },
        link: function(scope, element, attrs, ngModel) {
            if(!ngModel) return; // do nothing if no ng-model
            var dirty_class = attrs.dirtyClass || 'is-dirty';
            if(dirty_class==='ng-dirty')
                throw new Error('dirtyClass cannot be equal to "ng-dirty", it is angular reserved class name');
            
            var names = (attrs.gridUpdateBlur || '').split(',');
            var gridName = names[0] || 'grid';
            var itemName = names[1] || 'item';
            var grid = object.deepGet(scope, gridName);
            var item = object.deepGet(scope, itemName);
            if(!grid) throw new Error('Scope has not grid with name "'+gridName+'"');
            if(!item) throw new Error('Scope has not grid item with name "'+itemName+'"');
            
            var isDirty = false;
            function setDirty(dirty){
                isDirty = dirty;
                if(isDirty) element.addClass(dirty_class);
                else element.removeClass(dirty_class);
            }
            
            function reset(){
                scope.$apply(function(){
                    ngModel.$setViewValue('firstValue');
                    setDirty(false);
                });
            }
            
            function afterUpdate(updatedItem){
                setPristine();
                if(attrs.afterUpdate) scope.$eval(attrs.gridAfterUpdate);
            }
            
            function setPristine(){
                setDirty(false);
                firstValue = ngModel.$viewValue;
            }
            
            element.on('blur', function(){
                if(isDirty) grid.updateItem(item, afterUpdate);
            });
            
            element.bind("keydown keypress", function (event) {
                if(event.which === 13 && isDirty && element[0].nodeName==='INPUT') {
                    grid.updateItem(item, afterUpdate);
                    event.preventDefault();
                }
                //if(event.which === 27 && isDirty) {
                //    reset();
                //    event.preventDefault();
                //}
            });
            
            // catch the init value
            var firstValue = '';
            scope.$watch(ngModel.$viewValue, function(){
                firstValue = ngModel.$viewValue;
            });
            
            ngModel.$viewChangeListeners.push(function(){
                if(firstValue !== ngModel.$viewValue) setDirty(true);
                else setDirty(false);
            });
        }
    };
}])
.factory('NeGrid',['$timeout','neObject', function($timeout, object){
    
    function Grid(settings){
        
        var args = [ {}, Grid.defaults ];
        for(var i=0;i<arguments.length;i++) args.push(arguments[i]);
        settings = angular.merge.apply(angular, args);
        
        // init values
        this.id = settings.id;
        this.idKey = settings.idKey || 'id';
        this.defaultLimit = settings.defaultLimit || 10;
        this.limit = settings.limit || this.defaultLimit; //default page size
        this.maxLimit = settings.maxLimit || 100; //max page size
        this.defaultQuery = settings.defaultQuery || {};
        this.defaultSort = settings.defaultSort || {};
        this.interceptLoad = settings.interceptLoad || settings.beforeLoad || settings.loadInterceptor;
        this.onQuery = settings.onQueryChange || settings.onQuery || settings.onFilter;
        this.onLoad = settings.onLoad; // onLoad(items, pagination)
        this.onFill = settings.onFill || settings.onData;
        this.onSelect = settings.onSelect;
        this.onFocus = settings.onFocus;
        this.onUpdate = settings.onUpdate;
        this.onCreate = settings.onCreate;
        this.onRemove = settings.onRemove;
        this.resource = settings.restResource || settings.resource;
        this.getResourceMethod = settings.getResourceMethod || settings.resourceMethod || (typeof this.resource === 'function' ? this.resource : null) || getResourceMethod; // getResourceMethod(opType, item)
        this.autoLoad = settings.autoLoad || settings.loadOnChange;
        this.multiSelect = settings.multiSelect || settings.multiselect || false;
        // if(!this.resource) throw new Error('neGrid: restResource is undefined');
        // if(!this.id) throw new Error('neGrid: grid must have an id');
        
        // defaults
        this.silentMode = false;
        this.pagination = { page: settings.page || this.defaultQuery.$page || 1 };
        this.page = this.pagination.page;
        this.pagesCount = 1;
        this.query = object.extend('data', {}, settings.query || {}, { $page:this.page, $limit:this.limit }, this.defaultQuery);
        this.sort = object.extend('data', {}, this.defaultSort || {}, settings.sort || {});
        this.items = [];
        this.disabled = true; // default grid state is disabled
        
        // private
        this.doSilent = this.doSilent;
        
        // exposed methods
        this.fillItems = fillItems; // fillItems(items, pagination)
        this.addItems = appendItems; // appendItems(items)
        this.addItem = appendItems; // appendItems(items)
        this.appendItems = appendItems; // appendItems(items)
        this.appendItem = appendItems; // appendItems(items)
        this.prependItems = prependItems; // prependItems(items)
        this.prependItem = prependItems; // prependItems(items)
        this.setSort = setSort; // setSort(sortObj)
        this.setSortSilent = doSilent('setSort');
        this.setSortBy = setSortBy; // setSortBy(sortBy, sortDir)
        this.setSortBySilent = doSilent('setSortBy');
        this.updateQuery = updateQuery; // updateQuery(query)
        this.updateQuerySilent = doSilent('updateQuery');
        this.setQuery = setQuery; // setQuery(filterQuery)
        this.setQuerySilent = doSilent('setQuery');
        this.setFilter = setQuery; // setQuery(filterQuery)
        this.setFilterSilent = doSilent('setQuery');
        this.setPage = setPage; // setPage('first','last','next','prev','refresh')
        this.setPageSilent = doSilent('setPage');
        this.load = load; // load(cb)
        this.refresh = load; // load(cb)
        this.createItem = createItem; // createItem(item)
        this.updateItem = updateItem; // updateItem(item)
        this.refreshItem = refreshItem; // refreshItem(item)
        this.removeItem = removeItem; // removeItem(item)
        this.selectItem = selectItem; // selectItem(item, forceSelected)
        this.selectAll = selectAll; // selectAll(forceSelected)
        this.toggleItemSelection = toggleItemSelection; // toggleItemSelection(item)
        this.toggleSelection = toggleSelection; // toggleSelection()
        this.focusItem = focusItem; // focusItem(item)
        this.getFocusedItem = getFocusedItem; // getFocusedItem()
        this.getSelectedItems = getSelectedItems; // getSelectedItems()
        this.clearSelection = clearSelection; // clearSelection()
        
        return this;
    }
    
    // global default settings
    Grid.defaults = {};
    
    function doSilent(propName){
        return function(){
            var grid = this;
            grid.silentMode = true;
            grid[propName].apply(grid, arguments);
            grid.silentMode = false;
            return grid;
        };
    }
    
    function getResourceMethod(opType, item){
        if(!this.resource) throw new Error('NeGrid: resource is undefined');
        // opType = 'find','create','update','remove'
        return this.resource[opType]; 
    }
    
    // methods definitions
    function fillItems(items, pagination){
        var grid = this;
        pagination = pagination || {};
        grid.items = items;
        grid.pagination = pagination;
        grid.pagesCount = Math.ceil(pagination.count / grid.limit);
        
        if(pagination.page <= 1) grid.prevDisabled = true;
        else grid.prevDisabled = !pagination.prev;
        if(pagination.spage >= grid.pagesCount) grid.nextDisabled = true;
        else grid.nextDisabled = !pagination.next;
        
        if(typeof grid.onFill === 'function' && !grid.silentMode) grid.onFill(grid.items, grid.pagination, grid.query);
        return this;
    }
    
    function appendItems(items){
        items = Array.isArray(items) ? items : [items];
        Array.prototype.push.apply(this.items, items);
        return this;
    }
    
    function prependItems(items){
        items = Array.isArray(items) ? items : [items];
        Array.prototype.unshift.apply(this.items, items);
        return this;
    }
    
    function setSort(sortObj, cb){
        var grid = this;
        grid.sort = sortObj;
        return grid.setPage('first', cb);
    }
    
    function setSortBy(sortBy, sortDir){
        if(!sortBy) return;
        var sort = {};
        sort[sortBy] = sortDir || this.sortDir;
        return this.setSort(sort);
    }
    
    function load(cb, errCb){
        var grid = this;
        if(!grid.interceptLoad || (grid.interceptLoad && grid.interceptLoad(grid.query)!==false)){            
            grid.disabled = true;
            grid.lastFindReqId = grid.getResourceMethod('find')(grid.query, function(items, pagination){
                if(grid.lastFindReqId && grid.lastFindReqId !== this.requestId) return;

                if(typeof grid.onLoad === 'function') grid.onLoad(items, pagination);
                grid.fillItems(items, pagination);
                if(cb) cb();
                grid.disabled = false;
            }, errCb);
        }
        return grid;
    }
    
    function setPage(pageNum, cb, newQuery){
        if(typeof arguments[0] === 'function'){
            cb = arguments[0];
            pageNum = null;
        }
        
        var grid = this;
        var page;
        if(typeof pageNum==='number') page = pageNum;
        else if(pageNum==='first') page = 1;
        else if(pageNum==='next') page = grid.pagination.page + 1;
        else if(pageNum==='last') page = grid.pagesCount;
        else if(pageNum==='prev') page = grid.pagination.page - 1;
        else if(pageNum==='refresh' || pageNum === null) page = grid.pagination.page || 1;
        else page = 1;

        if(grid.pagesCount && page > grid.pagesCount && typeof pageNum !== 'number') page = grid.pagesCount+0;
        if(page <= 0) page = 1;
        
        grid.page = page;
        grid.updateQuery(newQuery);
        if(grid.autoLoad && !grid.silentMode) return grid.load(cb);
        else if(cb) cb();
        
        return grid;
    }
    
    function setQuery(newQuery, cb){
        var grid = this;
        grid.query = object.extend('data', {}, grid.defaultQuery || {}, newQuery || {});
        grid.setPage(grid.query.$page || 'first', cb, newQuery);
        return grid;
    }
    
    function updateQuery(newQuery){
        var grid = this;
        newQuery = newQuery || {};
        
        grid.page = newQuery.$page || grid.page;
        grid.limit = newQuery.$limit || grid.limit;
        grid.sort = newQuery.$sort || grid.sort;
        
        if(grid.page && (typeof grid.page !== 'number' || grid.page <= 0)) grid.page = 1;
        
        // check limit boundaries
        if(!grid.limit || grid.limit < 0) grid.limit = grid.defaultLimit;
        else if(grid.limit > grid.maxLimit) grid.limit = grid.maxLimit;
        
        var query = object.extend('data', {}, newQuery, { $limit:grid.limit, $sort:{}, $page:grid.page });
        
        // merge sort with defaultSort
        if(grid.sort) query.$sort = grid.sort;
        query.$sort = object.extend('data', {}, grid.defaultSort || {}, query.$sort || {});
        if(Object.keys(query.$sort).length===0) delete query.$sort;
        
        delete grid.query.$page;
        delete grid.query.$sort;
        delete grid.query.$limit;
        grid.query = object.extend('data', query, grid.query || {});
        
        if(grid.onQuery && !grid.silentMode) grid.onQuery(grid.query);
        
        return grid;
    }
    
    function createItem(item, cb, errCb){
        var grid = this;
        
        grid.getResourceMethod('create', item)(item, function(data){
            grid.setPage('first', cb);
            if(typeof grid.onCreate === 'function') grid.onCreate(item);
            if(!grid.autoLoad) grid.load(cb);
        }, errCb);
        return grid;
    }
    
    function updateItem(item, cb, errCb){
        var grid = this;
        grid.getResourceMethod('update', item)(item, function(data){
            var index = grid.items.indexOf(item);
            var oldItem = angular.copy(item);
            grid.items[ index ] = object.extend('data', grid.items[ index ], data);
            if(grid.onUpdate) grid.onUpdate(grid.items[ index ], oldItem);
            if(cb) cb(grid.items[ index ]);
        }, errCb);
        return grid;
    }
    
    function refreshItem(item, cb, errCb){
        var grid = this;
        var idKey = grid.idKey;
        var idQuery = {};
        idQuery[ idKey ] = object.deepGet(item, idKey);
        
        grid.getResourceMethod('find', item)(idQuery, function(items, pagination){
            var index = grid.items.indexOf(item);
            grid.items[ index ] = object.extend('data', grid.items[ index ], items[0]);
            if(cb) cb(grid.items[ index ]);
        }, errCb);
        return grid;
    }
    
    function removeItem(item, cb, errCb){
        var grid = this;
        grid.getResourceMethod('remove',item)(item, function(data){
            grid.items.splice(grid.items.indexOf(item), 1);
            if(grid.onRemove) grid.onRemove(item);
            if(cb) cb(item);
        }, errCb);
        return grid;
    }
    
    function focusItem(item){
        var grid = this;
        if(item.$focused === true) return grid; // row is already focused
        
        for(var i=0;i<grid.items.length;i++) { // clear all focused items
            grid.items[i].$focused = false;
        }
        item.$focused = true;
        grid.focusedItem = item;
        if(typeof grid.onFocus === 'function') grid.onFocus(item);
        return grid;
    }
    
    function getFocusedItem(){
        var grid = this;
        for(var i=0;i<grid.items.length;i++) {
            if(grid.items[i].$focused === true) return grid.items[i];
        }
    }
    
    function selectItem(item, forceSelected){
        var grid = this;
        
        if(!grid.multiSelect){
            for(var i=0;i<grid.items.length;i++){
                delete grid.items[i].$selected;
            }
        }
        
        if(typeof forceSelected === 'boolean') item.$selected = forceSelected;
        else item.$selected = !item.$selected;
        
        if(typeof grid.onSelect === 'function') grid.onSelect(item);
        return grid;
    }
    
    function toggleItemSelection(item){
        return this.selectItem(item);
    }
    
    function selectAll(forceSelected){
        var grid = this;
        if(!grid.multiSelect) return grid;
        for(var i=0;i<grid.items.length;i++) grid.selectItem(grid.items[i], forceSelected);
        return grid;
    }
    
    function toggleSelection(){
        return this.selectAll();
    }
    
    function clearSelection(){
        var grid = this;
        
        for(var i=0;i<grid.items.length;i++){
            delete grid.items[i].$selected;
        }
        return grid;
    }
    
    function getSelectedItems(){
        var grid = this;
        var selectedRows = [];
        for(var i=0; i<grid.items.length; i++) {
            if(grid.items[i].$selected===true) selectedRows.push(grid.items[i]);
        }
        
        return selectedRows;
    }
    
    Grid.define = 
    Grid.create = function(settings){
        return new Grid(settings);
    };
    
    return Grid;
}]);

