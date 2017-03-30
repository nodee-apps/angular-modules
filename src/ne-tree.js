
/**
 *                                                  NE TREE
 * ***************************************************************************************************************************
 */

/*
 * TREEVIEW - factory defining treeview behaviour
 *
 * Usage:
 * var myTree = new Tree({
 *      id: 'products',
 *      resource: products,
 *      parentReferenceKey: 'parentId',
 *      // childrenKey: 'children',
 *      // childrenCountKey: 'childrenCount',
 *      // childrenReferenceKey: 'childIds',
 *      // ancestorsReferenceKey: 'ancestors',
 *      autoLoad:true,
 *      multiSelect:false,
 *      limit:20,
 *      itemTemplate: 'neTree/item.html'
 * }).load();
 *
 */


angular.module('neTree',['neObject'])
.run(['$templateCache', function($templateCache) {
    $templateCache.put('neTree/item.html','<div>{{item}}</div>');
    
    $templateCache.put('neTree/child.html',
                       '<div ng-include="tree.itemTemplate"></div>' +
                       '<ul ng-show="item.$expanded">' +
                       '    <li ng-repeat="item in item.$children" ng-include="\'neTree/child.html\'"></li>' +
                       '</ul>');
    
    $templateCache.put('neTree/tree.html',
                       '<div class="tree">' +
                       '    <ul>' +
                       '        <li ng-repeat="item in tree.items" ng-include="\'neTree/child.html\'"></li>' +
                       '    </ul>' +
                       '    <div class="tree-backdrop" ng-show="tree.disabled"></div>' +
                       '</div>');
    
    $templateCache.put('neTree/tree-item-pagination.html',
                       '<div ng-if="item.$expanded" class="tree-item-pagination" ng-class="{\'tree-item-pagination-border\':item.$children.length}">'+
                       '    <div ng-if="item.$pagination && !item.$paginationDisabled" class="btn-group btn-group-xs">'+
                       '        <button class="btn btn-light btn-xs" ng-click="tree.setPage(item, \'prev\')" ng-disabled="item.$prevDisabled">'+
                       '            <i class="fa fa-backward"></i>'+
                       '        </button>'+
                       '        <button class="btn btn-light btn-xs" ng-click="tree.addPage(item)" ng-disabled="item.$nextDisabled">'+
                       '            {{item.$pagination.page}} <span ng-if="item.$pagination.pagesCount">{{::\'of\'|translate}} {{item.$pagination.pagesCount}}</span>'+
                       '        </button>'+
                       '        <button class="btn btn-light btn-xs" ng-click="tree.setPage(item, \'next\')" ng-disabled="item.$nextDisabled">'+
                       '            <i class="fa fa-forward"></i>'+
                       '        </button>'+
                       '    </div>'+
                       '</div>');
}])
.directive('neTreeUpdateBlur', ['$timeout', function($timeout){
    return {
        restrict: 'A', // only activate on element attribute
        require: '?ngModel', // get a hold of NgModelController
        //scope:{ blurUpdate:'=' },
        link: function(scope, element, attrs, ngModel) {
            if(!ngModel) return; // do nothing if no ng-model
            var dirty_class = attrs.dirtyClass || 'is-dirty';
            if(dirty_class==='ng-dirty')
                throw new Error('dirtyClass cannot be equal to "ng-dirty", it is angular reserved class name');
            
            var names = (attrs.treeUpdateBlur || '').split(',');
            var itemName = names[0] || 'item';
            var treeName = names[1] || 'tree';
            if(!scope[treeName]) throw new Error('Scope has not grid with name "'+treeName+'"');
            if(!scope[itemName]) throw new Error('Scope has not grid item with name "'+itemName+'"');
            
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
            
            function setPristine(){
                setDirty(false);
                firstValue = ngModel.$viewValue;
            }
            
            element.on('blur', function(){
                if(isDirty) scope[treeName].updateItem(scope[itemName], setPristine);
            });
            
            element.bind("keydown keypress", function (event) {
                if(event.which === 13 && isDirty && element[0].nodeName==='INPUT') {
                    scope[treeName].updateItem(scope[itemName], setPristine);
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
.directive('neTree', [function(){    
    return {
        restrict:'EA',
        templateUrl: 'neTree/tree.html',
        scope:{ tree:'=neTree' },
        replace:true,
        link: function(scope, elm, attrs){
            scope.tree.itemTemplate = scope.tree.itemTemplate || 'neTree/item.html';
            //scope.$eval(attrs.treeview);
        }
    };
}])
.directive('neTreeItemPagination', [function(){    
    return {
        restrict:'EA',
        templateUrl: 'neTree/tree-item-pagination.html',
        link: function(scope, elm, attrs){

        }
    };
}])
.factory('NeTree',['$timeout','neObject', function($timeout, object){
    
    // TODO: helper for creating nested tree structure from flat array - using "item.ancestors" property
    //    this.treeFromArray = function(array, rootLevel, rootItemId){
    //        array = array || [];
    //        if(arguments.length===2 && typeof arguments[1]==='string'){
    //            rootItemId = arguments[1];
    //            rootLevel = 0;
    //        }
    //        rootLevel = rootLevel || 0;
    //        
    //        var parentIdObj = {}, parentId;
    //        var rootChildren = [];
    //        
    //        for(var i=0;i<array.length;i++){
    //            if(rootItemId && rootItemId === array[i].ancestors[array[i].ancestors.length-1]) {
    //                rootChildren.push(array[i]);
    //            }
    //            else if(!rootItemId && array[i].ancestors.length === rootLevel) {
    //                rootChildren.push(array[i]);
    //            }
    //            else {
    //                parentId = array[i].ancestors[array[i].ancestors.length-1];
    //                parentIdObj[parentId] = parentIdObj[parentId] || [];
    //                parentIdObj[parentId].push(array[i]);
    //            }
    //        }
    //        
    //        return (function createTree(children, parentIdObj){
    //            if(!children) return [];
    //            
    //            for(var i=0;i<children.length;i++){
    //                children[i].$children = createTree(parentIdObj[children[i].id], parentIdObj);
    //            }
    //            return children;
    //        })(rootChildren, parentIdObj);
    //    };
    
    function Tree(settings){
        
        var args = [ {}, Tree.defaults ];
        for(var i=0;i<arguments.length;i++) args.push(arguments[i]);
        settings = angular.merge.apply(angular, args);
        
        // init values
        this.id = settings.id;
        this.idKey = settings.idKey || 'id';
        this.childrenKey = settings.childrenKey;
        this.childrenCountKey = settings.childrenCountKey;
        this.childrenReferenceKey = settings.childrenReferenceKey;
        this.parentReferenceKey = settings.parentReferenceKey;
        this.ancestorsReferenceKey = settings.ancestorsReferenceKey;
        
        this.getChildrenQuery = settings.getChildrenQuery || getChildrenQuery; // getChildrenQuery(parent)
        this.maintainReferences = settings.maintainReferences || maintainReferences; // maintainReferences(parent, child, removeMode)
        
        this.defaultLimit = settings.defaultLimit || 10;
        this.$limit = settings.limit || this.defaultLimit; //default page size
        this.maxLimit = settings.maxLimit || 100; //max page size
        this.defaultQuery = settings.defaultQuery || {};
        this.defaultSort = settings.defaultSort || {};
        this.interceptLoad = settings.interceptLoad || settings.beforeLoad || settings.loadInterceptor;
        
        this.onQuery = settings.onQueryChange || settings.onQuery || settings.onFilter;
        this.onFill = settings.onFill || settings.onData || settings.onLoad;
        this.onSelect = settings.onSelect;
        this.onFocus = settings.onFocus;
        this.onMove = settings.onMove;
        this.onUpdate = settings.onUpdate;
        this.onCreate = settings.onCreate;
        this.resource = settings.restResource || settings.resource;
        this.getResourceMethod = settings.getResourceMethod || settings.resourceMethod || (typeof this.resource === 'function' ? this.resource : null) || getResourceMethod; // getResourceMethod(opType, item)
        this.onRemove = settings.onRemove;
        this.autoLoad = settings.autoLoad || settings.loadOnChange;
        this.multiSelect = settings.multiSelect || settings.multiselect || false;
        // if(!this.resource) throw new Error('settings.resource is undefined');
        // if(!this.id) throw new Error('Tree must have property "id"');
        
        // defaults
        this.silentMode = false;
        this.$query = object.extend('data', {}, { $page:this.$page, $limit:this.$limit }, this.defaultQuery);
        this.items = [];
        this.itemTemplate = settings.itemTemplate || settings.include || 'neTree/item.html';
        this.disabled = true; // default grid state is disabled
        
        // exposed methods
        this.fillItems = fillItems; // fillItems([parent,] items)
        this.fill = fillItems; // fillItems([parent,] items)
        this.addItems = appendItems; // appendItems([parent,] items)
        this.addItem = appendItems; // appendItems([parent,] items)
        this.appendItems = appendItems; // appendItems([parent,] items)
        this.appendItem = appendItems; // appendItems([parent,] items)
        this.prependItems = prependItems; // prependItems([parent,] items)
        this.prependItem = prependItems; // prependItems([parent,] items)
        this.setSort = setSort; // setSort([parent,] sortObj)
        this.setSortSilent = doSilent('setSort');
        this.setSortBy = setSortBy; // setSortBy([parent,] sortBy, sortDir)
        this.setSortBySilent = doSilent('setSortBy');
        this.updateQuery = updateQuery; // updateQuery([parent,] query)
        this.updateQuerySilent = doSilent('updateQuery');
        this.setQuery = setQuery; // setQuery([parent,] filterQuery)
        this.setQuerySilent = doSilent('setQuery');
        this.setFilter = setQuery; // setQuery([parent,] filterQuery)
        this.setFilterSilent = doSilent('setQuery');
        this.setPage = setPage; // setPage([parent,] 'first','last','next','prev','refresh')
        this.setPageSilent = doSilent('setPage');
        this.addPage = addPage; // addPage(parent, limit, cb)
        this.addPageSilent = doSilent('addPage');
        this.appendPage = addPage; // addPage(parent, limit, cb)
        this.appendPageSilent = doSilent('addPage');
        this.load = load; // load([parent,] cb)
        this.loadItems = load; // load([parent,] cb)
        this.refresh = load; // load([parent,] cb)
        this.refreshItems = load; // load([parent,] cb)
        
        this.refreshItem = refreshItem; // refreshItem(item, cb)
        this.createItem = createItem; // createItem(parent, item, appendChild, cb)
        this.copyItem = copyItem; // copyItem(item, cb)
        this.updateItem = updateItem; // updateItem(item, cb)
        this.removeItem = removeItem; // removeItem(item, cb)
        this.moveItem = moveItem; // moveItem(item, toItem, inside/after/before, cb)
        this.selectItem = selectItem; // selectItem(item)
        //this.selectAll = selectAll; // selectAll(parent)
        //this.expandAll = expandAll; // selectAll(parent)
        //this.toggleItemSelection = toggleItemSelection; // toggleItemSelection(item)
        //this.toggleSelection = toggleSelection; // toggleSelection()
        //this.deselectItems = deselectItems; // deselectItems()
        this.focusItem = focusItem; // focusItem(item)
        this.getFocusedItem = getFocusedItem; // getFocusedItem()
        this.getSelectedItems = getSelectedItems; // getSelectedItems()
        this.selectedItems = [];
        this.focusedItem = null; // reference to focusedItem
        this.walkItems = walkItems; // walkItems([parent,] fnc) - run fnc on all of items, and descendants
        this.walk = walkItems; // alias for walkItems
        this.getParentOf = getParentOf; // getParentOf(item)
        this.getParentsOf = getAncestorsOf; // getAncestorsOf(item)
        this.getAncestorsOf = getAncestorsOf; // getAncestorsOf(item)
        this.getChildrenOf = getChildrenOf; // getChildrenOf(item)
        this.getChildrenCountOf = getChildrenCountOf; // getChildrenCountOf(parent)
        
        return this;
    }
    
    // global default settings
    Tree.defaults = {};
    
    function doSilent(propName){
        return function(){
            var tree = this;
            tree.silentMode = true;
            tree[propName].apply(tree, arguments);
            tree.silentMode = false;
            return tree;
        };
    }
    
    function getResourceMethod(opType, item){
        if(!this.resource) throw new Error('NeTree: resource is undefined');
        // opType = 'find','create','update','remove'
        return this.resource[opType]; 
    }
    
    function walkItems(parent, fnc){ // run fnc on all of items, and descendants
        if(arguments.length === 1){
            fnc = arguments[0];
            parent = null;
        }
        
        var tree = this;
        if(parent && parent !== tree && fnc(parent, tree.getParentOf(parent)) === true) return; 
        
        return (function walkLevel(items, parent, fnc){
            items = items || [];
            for(var i=0;i<items.length;i++){
                if(fnc(items[i], parent) === true) return;
            }
            
            for(var i=0;i<items.length;i++){
                if(items[i].$children && items[i].$children.length > 0){
                    walkLevel(items[i].$children, items[i], fnc);
                }
            }
        })(parent ? (parent.$children || (parent===tree ? tree.items : [])) : tree.items, parent, fnc);
    }
    
    function getParentOf(item){
        var foundParent;
        this.walkItems(function(parent){
            if(parent.$children && parent.$children.indexOf(item) >= 0){
                foundParent = parent;
                return true;
            }
            else return false;
        });
        return foundParent;
    }
    
    function getAncestorsOf(item, ancestors){
        var tree = this;
        ancestors = ancestors || [];
        var parent = tree.getParentOf(item);
        if(parent) {
            ancestors.unshift(parent);
            return tree.getAncestorsOf(parent, ancestors);
        }
        return ancestors;
    }
    
    function getChildrenOf(parent){
        var tree = this;
        if(!parent) throw new Error('Wrong arguments');
        return parent.$children;
    }
    
    function getChildrenCountOf(parent){
        var tree = this;
        if(!parent) throw new Error('Wrong arguments');
        return (parent.$children || []).length;
        // return (object.deepGet(parent, tree.childrenCountKey) || []).length;
    }
    
    /*
     * Data Integrity methods
     */
    
    function getChildrenQuery(parent){
        var tree = this;
        var idKey = tree.idKey;
        var ancKey = tree.ancestorsReferenceKey;
        var parentKey = tree.parentReferenceKey;
        var childrenKey = tree.childrenReferenceKey;
        var query = {};
        
        if(ancKey){
            if(!parent) query[ ancKey ] = { $size:0 };
            else { 
                query.$and = [{},{}];
                query.$and[0][ ancKey ] = { 
                    $size: (object.deepGet(parent,ancKey) || []).length + 1 
                };
                query.$and[1][ ancKey ] = object.deepGet(parent, idKey);
            }
        }
        else if(parentKey){
            query[ parentKey ] = object.deepGet(parent, idKey);
        }
        else if(childrenKey){
            query[ childrenKey ] = object.deepGet(parent, childrenKey);
        }
        else throw new Error('Cannot create query, "ancestorsReferenceKey", or "parentReferenceKey", or "childrenReferenceKey" not set');
        
        return query;
    }
    
    function maintainReferences(parent, child, remove){
        if(!parent || !child) return;
        
        var tree = this;
        var idKey = tree.idKey;
        var ancKey = tree.ancestorsReferenceKey;
        var parentKey = tree.parentReferenceKey;
        var childrenKey = tree.childrenReferenceKey;
        var countKey = tree.childrenCountKey;
        var childAlreadyRegistered = false;
        
        if(ancKey && !remove) {
            var ancs = [].concat(object.deepGet(parent, ancKey) || []);
            ancs.push( object.deepGet(parent, idKey) );
            object.deepSet(child, ancKey, ancs);
        }

        if(parentKey && !remove){
            var parentId = object.deepGet(parent, idKey);
            object.deepSet(child, parentKey, parentId);
        }

        if(childrenKey) {
            var childIds = object.deepGet(parent, childrenKey) || [];
            var childId = object.deepGet(child, idKey);
            
            if(!remove) {
                if(childIds.indexOf(childId) === -1) childIds.push( childId );
                else childAlreadyRegistered = true;
            }
            else {
                var index = childIds.indexOf( childId );
                if(index > -1) childIds.splice(index, 1);
            }
            object.deepSet(parent, childrenKey, childIds);
        }
        
        if(countKey && !childAlreadyRegistered) {
            var count = object.deepGet(parent, countKey) || 0;
            object.deepSet(parent, countKey, count+( !remove ? 1 : -1 ));
        }
    }
    
    /*
     * tree CRUD methods
     */
    
    function calcPagination(prefix, item, pagination){
        var tree = this;
        pagination = pagination || {};
        item[prefix+'limit'] = item[prefix+'limit'] || tree.defaultLimit;
        item[prefix+'pagination'] = pagination;
        item[prefix+'pagesCount'] = Math.ceil(pagination.count / item[prefix+'limit']);

        if(pagination.prev !== undefined) item[prefix+'prevDisabled'] = !pagination.prev;
        else if(pagination.page <= 1) item[prefix+'prevDisabled'] = true;
        
        if(pagination.next !== undefined) item[prefix+'nextDisabled'] = !pagination.next;
        else if(pagination.page >= item[prefix+'pagesCount']) item[prefix+'nextDisabled'] = true;
        
        item[prefix+'paginationDisabled'] = item[prefix+'prevDisabled'] && item[prefix+'nextDisabled'];
    }
    
    // methods definitions
    function fillItems(parent, items, pagination, fillMode){
        var tree = this;
        tree.disabled = false;
        
        if(Array.isArray(arguments[0])){
            pagination = arguments[1];
            items = arguments[0];
            parent = null;
        }
        
        if(arguments.length === 3 && typeof arguments[2] === 'string'){
            fillMode = arguments[2];
            pagination = parent ? parent.$pagination : null;
        }
        
        items = Array.isArray(items) ? items : [items];
        
        if(parent) {
            if(['push','append'].indexOf(fillMode) > -1) Array.prototype.push.apply(parent.$children, items);
            else if(['unshift','prepend'].indexOf(fillMode) > -1) Array.prototype.unshift.apply(parent.$children, items);
            else parent.$children = items;
            calcPagination('$', parent, pagination);
        }
        else {
            if(['push','append'].indexOf(fillMode) > -1) Array.prototype.push.apply(tree.items, items);
            else if(['unshift','prepend'].indexOf(fillMode) > -1) Array.prototype.unshift.apply(tree.items, items);
            else tree.items = items;
            calcPagination('$', tree, pagination); // ensure paging is also set with $ prefix to unify in templates
        }
        
        parseChildrenKey(tree, parent);
        if(typeof tree.onFill === 'function' && !tree.silentMode) {
            if(parent) tree.onFill(parent, parent.$children, parent.$pagination, parent.$query);
            else tree.onFill(tree, tree.items, tree.$pagination, tree.$query);
        }
        return this;
    }
    
    function parseChildrenKey(tree, parent){
        tree.walkItems(parent, function(item, parent){
            if(tree.childrenKey){
                var children = object.deepGet(item, tree.childrenKey);
                if(children && !item.$children) item.$children = children;
            }
            item.$level = parent ? parent.$level+1 : 0;
        });
    }
    
    function setSort(parent, sortObj, cb){
        if(typeof arguments[1] === 'function'){
            cb = arguments[1];
            sortObj = arguments[0];
            parent = null;
        }
        
        var tree = this;
        if(parent) parent.$sort = sortObj;
        else tree.$sort = sortObj;
        return grid.setPage('first', parent, cb);
    }
    
    function setSortBy(parent, sortBy, sortDir){
        if(typeof arguments[0] === 'string'){
            sortDir = arguments[1];
            sortBy = arguments[0];
            parent = null;
        }
        
        if(!sortBy) return;
        var sort = {};
        sort[sortBy] = sortDir;
        return this.setSort(parent, sort);
    }
    
    function load(parent, loadMode, cb, errCb){
        var tree = this;
        if(arguments.length===2 && typeof arguments[1]==='function'){
            cb = arguments[1];
            loadMode = false;
        }
        else if(arguments.length === 1 && typeof arguments[0] === 'function'){
            cb = arguments[0];
            loadMode = false;
            parent = null;
        }
        
        var children = parent ? tree.getChildrenOf(parent) : tree.items;
        var childrenCount = parent ? tree.getChildrenCountOf(parent) : tree.items.length;
        
        if(!parent || !children || (children.length < childrenCount) || loadMode){
            
            if(!tree.interceptLoad || (tree.interceptLoad && tree.interceptLoad((parent||tree).$query, parent)!==false)){
                
                var query = parent ? (parent.$query || {}) : tree.$query || {};
                query = object.extend('data', {}, { $page:1, $limit:(tree.$limit || tree.defaultLimit) }, tree.defaultQuery, query, tree.getChildrenQuery(parent));
                if(query.$sort) query.$sort = object.extend('data', {}, tree.defaultSort ,query.$sort);
                
                if(parent) parent.$query = query;
                else delete query.$limit;
                tree.disabled = true;
                tree.lastFindReqId = tree.getResourceMethod('find', parent)(query, function(items, pagination){
                    if(tree.lastFindReqId && tree.lastFindReqId !== this.requestId) return;

                    tree.fillItems(parent, items, pagination, loadMode);
                    if(cb) cb(items);
                    tree.disabled = false;
                }, errCb);

            }
        }
        else if(cb) cb(tree.items);
        
        return tree;
    }
    
    function setPage(parent, pageNum, cb, newQuery){
        if(typeof arguments[0] === 'function'){
            cb = arguments[0];
            pageNum = null;
        }
        else if(typeof arguments[1] === 'function'){
            cb = arguments[1];
            pageNum = arguments[0];
            parent = null;
        }

        var tree = this;
        var page;
        parent = parent || tree;
        parent.$pagination = parent.$pagination || {};
        
        if(typeof pageNum==='number') page = pageNum;
        else if(pageNum==='first') page = 1;
        else if(pageNum==='next') page = parent.$pagination.page + 1;
        else if(pageNum==='last') page = parent.$pagesCount;
        else if(pageNum==='prev') page = parent.$pagination.page - 1;
        else if(pageNum==='refresh' || pageNum === null) page = parent.$pagination.page || 1;
        else page = 1;
        
        if(parent.$pagesCount && page > parent.$pagesCount && typeof pageNum !== 'number') page = parent.$pagesCount+0;
        if(page <= 0) page = 1;
        
        parent.$page = page;
        tree.updateQuery(parent, newQuery);
        if(tree.autoLoad && !tree.silentMode) return tree.load(parent, true, cb);
        else if(cb) cb();

        return tree;
    }
    
    function setQuery(parent, newQuery, cb){
        if(arguments.length===2){
            cb = arguments[1];
            newQuery = arguments[0];
            parent = null;
        }
        
        parent = parent || tree;
        var tree = this;
        parent.$query = object.extend('data', {}, tree.defaultQuery || {}, newQuery || {});
        tree.setPage(parent, parent.$query.$page || 'first', cb, newQuery);
        return tree;
    }
    
    function addPage(parent, pageNum, cb){
        if(typeof arguments[1] === 'function'){
            cb = arguments[1];
            if(typeof arguments[0] === 'number'){
                limit = arguments[0];
                parent = null;
            }
            else limit = null;
        }
        
        var tree = this;
        pageNum = pageNum || 'next';
        
        tree.setPageSilent(parent, pageNum);
        if(tree.autoLoad && !tree.silentMode) return tree.load(parent, 'push', cb);
        else if(cb) cb();
        
        return tree;
    }
    
    function appendItems(parent, items){
        if(arguments.length === 1){
            items = arguments[0];
            parent = null
        }
        var tree = this;
        
        if(!items) return;
        tree.fillItems(parent, items, 'push');
        return tree;
    }
    
    function prependItems(parent, items){
        if(arguments.length === 1){
            items = arguments[0];
            parent = null
        }
        var tree = this;

        if(!items) return;
        tree.fillItems(parent, items, 'unshift');
        return tree;
    }
    
    function updateQuery(parent, newQuery){
        if(arguments.length === 1){
            newQuery = arguments[0];
            parent = null;
        }
        
        var tree = this;
        newQuery = newQuery || {};
        parent = parent || tree;
        
        parent.$page = newQuery.$page || parent.$page;
        parent.$limit = newQuery.$limit || parent.$limit || tree.$limit;
        parent.$sort = newQuery.$sort || parent.$sort;

        if(parent.$page && (typeof parent.$page !== 'number' || parent.$page <= 0)) parent.$page = 1;

        // check limit boundaries
        if(!parent.$limit || parent.$limit < 0) parent.$limit = tree.defaultLimit;
        else if(parent.$limit > tree.maxLimit) parent.$limit = tree.maxLimit;

        var query = object.extend('data', {}, newQuery, { $limit:parent.$limit, $sort:{}, $page:parent.$page });

        // merge sort with defaultSort
        if(parent.$sort) query.$sort = parent.$sort;
        query.$sort = object.extend('data', {}, tree.defaultSort || {}, parent.$sort || {});
        if(Object.keys(query.$sort).length===0) delete query.$sort;

        if(parent.$query){
            delete parent.$query.$page;
            delete parent.$query.$sort;
            delete parent.$query.$limit;
        }
        parent.$query = object.extend('data', query, parent.$query || {});
        if(tree.onQuery && !tree.silentMode) tree.onQuery(parent.$query, parent);

        return tree;
    }
    
    function copyItem(item, appendChild, cb){
        var copy = angular.copy(item);
        object.deepRemove(copy, this.idKey);
        return this.createItem(this.getParentOf(item), copy, appendChild, cb);
    }
    
    function createItem(parent, item, appendChild, cb, errCb){
        var tree = this;
        
        if(typeof arguments[1] === 'boolean'){
            cb = arguments[2];
            appendChild = arguments[1];
            item = arguments[0];
            parent = null;
        }
        else if(arguments.length === 3 && typeof arguments[2] === 'function') {
            cb = arguments[2];
            appendChild = false;
        }
        else if(arguments.length === 2 && typeof arguments[1] === 'function') {
            cb = arguments[1];
            item = arguments[0];
            parent = null;
        }
        else if(arguments.length === 1){
            item = arguments[0];
            parent = null;
        }
        
        // ad parentId or ancestors
        tree.maintainReferences(parent, item);
        
        tree.getResourceMethod('create', item, parent)(item, function(newItem){
            item = object.extend('data', item, newItem);
            
            if(appendChild && parent) { // add childId if childReferenceKey
                tree.maintainReferences(parent, item);
            }
            
            if(!appendChild) {
                if(typeof cb ==='function') cb(item);
                if(typeof tree.onCreate ==='function') tree.onCreate(item);
            }
            else if(parent && parent.$children){
                parent.$expanded = true;
                tree.appendItems(parent, newItem);
                if(typeof cb ==='function') cb(newItem);
                if(typeof tree.onCreate ==='function') tree.onCreate(newItem);
            }
            else {
                tree.load(parent, function(children){
                    if(parent) parent.$expanded = true;
                    for(var i=0;i<children.length;i++){
                        if(object.deepGet(children[i], tree.idKey) === object.deepGet(newItem, tree.idKey)){
                            if(typeof cb ==='function') cb(children[i]);
                            if(typeof tree.onCreate ==='function') tree.onCreate(children[i]);
                            break;
                        }
                    }
                });
            }
        }, errCb);
        return tree;
    }
    
    
    function updateItem(item, cb, errCb){
        this.getResourceMethod('update', item)(item, function(data){
            item = object.extend('data', item, data);
            if(cb) cb(item);
        }, errCb);
        return this;
    }
    
    function refreshItem(item, cb, errCb){
        var idKey = this.idKey;
        var idQuery = {};
        idQuery[ idKey ] = object.deepGet(item, idKey);
        
        this.getResourceMethod('find', item)(idQuery, function(data){
            var wasExpanded = item.$expanded;
            item = data;
            if(wasExpanded) load(item, function(){
                if(cb) cb(item);  
            })
            else if(cb) cb(item);
        }, errCb);
        return this;
    }
    
    function moveItem(item, toItem, mode, cb){
    //    var tree = this;
    //    
    //    var parent, newIndex, oldParent = tree.getParentOf(item);
    //    var treeIndex = ((oldParent || {}).$children || tree.items).indexOf(item);
    //    
    //    if(item===toItem) return;
    //    else if(mode === 'inside') {
    //        parent = toItem;
    //        newIndex = null; // this will push item to the end
    //    }
    //    else if(mode === 'before') {
    //        parent = tree.getParentOf(toItem);
    //        newIndex = toItem.orderIndex;
    //    }
    //    else if(mode === 'after') {
    //        parent = tree.getParentOf(toItem);
    //        newIndex = toItem.orderIndex+1;
    //    }
    //    else return;
    //    
    //    var itemToUpdate = angular.copy(item);
    //    itemToUpdate.ancestors = parent ? angular.copy(parent.ancestors) : [];
    //    if(parent) itemToUpdate.ancestors.push(parent.id);
    //    if(!newIndex) delete itemToUpdate.orderIndex;
    //    else itemToUpdate.orderIndex = newIndex;
    //    
    //    tree.resource.update(itemToUpdate, function(newItem){
    //        item.orderIndex = newIndex;
    //        ((oldParent || {}).$children || tree.items).splice(treeIndex ,1);
    //        
    //        tree.loadItems(parent, true, function(children){
    //            if(parent) parent.$expanded = true;
    //            
    //            for(var i=0;i<children.length;i++){
    //                if(children[i].id === newItem.id){
    //                    if(typeof cb ==='function') cb(children[i]);
    //                    if(tree.onMove) tree.onMove(children[i]);
    //                    break;
    //                }
    //            }
    //        });
    //    });
    }
    
    function removeItem(item, cb, errCb){
        var tree = this;
        
        tree.getResourceMethod('remove',item)(item, function(){
            tree.maintainReferences( tree.getParentOf(item), item, true );
            
            var parent = tree.getParentOf(item);
            if(parent) parent.$children.splice(parent.$children.indexOf(item) ,1);
            else tree.items.splice(tree.items.indexOf(item), 1);
            
            if(typeof cb ==='function') cb();
        }, errCb);
    }
    
    function focusItem(item, toggle){
        var tree = this;
        var wasFocused = item.$focused ? true : false;
        
        if(tree.focusedItem && tree.focusedItem !== item) tree.focusedItem.$focused = false;
        item.$focused = toggle ? !item.$focused : true;
        tree.focusedItem = toggle && wasFocused ? null : item;
        if(typeof tree.onFocus === 'function') tree.onFocus(item);
        return tree;
    }
    
    function getFocusedItem(){
        return this.focusedItem;
    }
    
    function selectItem(item){ // toggle item selection
        var tree = this;
        
        var deselectAll = !tree.multiSelect;
        var isSelected = item.$selected;
        if(deselectAll) {
            for(var i=0;i<tree.selectedItems.length;i++){
                if(tree.selectedItems[i].$selected) tree.selectedItems[i].$selected = false;
            }
            if(!isSelected) {
                item.$selected = true;
                tree.selectedItems = [item];
            }
            else tree.selectedItems = [];
        }
        else if(item.$selected) { // deselect item
            item.$selected = false;
            var index = tree.selectedItems.indexOf(item);
            if(index >= 0) tree.selectedItems.splice(index,1);
        }
        else {
            item.$selected = true;
            tree.selectedItems.push(item);
        }
        
        if(typeof tree.onSelect === 'function') tree.onSelect(item, item.$selected);
    }
    
    function deselectItems(){
        var tree = this;
        for(var i=0;i<tree.selectedItems.length;i++){
            if(tree.selectedItems[i].$selected) tree.selectedItems[i].$selected = false;
        }
        tree.selectedItems = [];
    }
    
    function getSelectedItems(){
        return this.selectedItems;
    }
    
    return Tree;
}]);