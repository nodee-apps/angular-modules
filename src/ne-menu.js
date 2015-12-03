
/**
 *                                                  NE MENU
 * ***************************************************************************************************************************
 */

angular.module('neMenu', [ ])
.factory('NeMenu', ['$document', '$timeout', function($document, $timeout){

    var _menus = {};

    function Menu(id, opts){
        if(typeof id !== 'string') throw new Error('NeMenu: menu ID is required !');
        if(_menus[ id ]) return _menus[ id ];

        var defaultOpts = {
            id: id,
            // onChange: function(key, value){},
            // onSelect: function(item, oldItem){}
        };
        var menu = angular.merge(this, defaultOpts, opts || {});

        menu.items = [
            //{
            //    id:'myid', icon:'fa fa-pencil', name:'Dashboard', href:'#/pencil',
            //    children:[
            //        { name:'sub item 1', href:'#/pencil/1' },
            //        { name:'sub item 1', href:'#/pencil/2' }
            //    ]
            //}
            //{ icon:'fa fa-file-text', name:'Content Management', href:'#/cms', },
            //{ icon:'fa fa-users', name:'Users Management', href:'#/users', }
        ];

        //        if(menu.cookies.use) {
        //            menu.state = $cookies.getObject('menu:'+menu.id) || {};
        //        }

        _menus[ id ] = menu;

        return menu;
    }

    Menu.prototype.set = function(key, value){
        var menu = this;
        menu[ key ] = value;
        if(menu.onChange) menu.onChange(key, value);
        return menu;
    };

    Menu.prototype.toggle = function(key){
        var menu = this;
        menu[ key ] = !menu[ key ];
        if(menu.onChange) menu.onChange(key, menu[ key ]);
        return menu;
    };

    Menu.prototype.select = 
        Menu.prototype.selectItem = function(item, $event){
        var menu = this;
        var prevSelected;

        if($event && (item.onSelect || item.children && item.children.length)) {
            $event.preventDefault();
            if(!item.selected) bindClose(item);
        }

        for(var i=0;i<menu.items.length;i++) {
            if(menu.items[i].selected) prevSelected = menu.items[i];

            if(menu.items[i] === item) menu.items[i].selected = !menu.items[i].selected;
            else menu.items[i].selected = false;
        }

        if(menu.onSelect) menu.onSelect(item, prevSelected);
        if(item.onSelect) item.onSelect(item, prevSelected);
        return menu;
    };

    // TODO: move to directive
    function bindClose(item){
        $timeout(function(){ // wait untill this click event finish
            $document.bind('click', close);

            function close() {
                $timeout(function(){ // force $rootScope.$apply via %$timeout
                    item.selected = false;
                    $document.unbind('click', close);
                });
            }
        }, 0, false);
    }

    Menu.prototype.get = 
        Menu.prototype.getItem = function walkChildren(id, parent){
        var menu = this;
        var item;
        var children = (parent ? parent.children : menu.items) || [];

        for(var i=0;i<children.length;i++){
            if(children[i].id === id) return children[i];
        }

        for(var i=0;i<children.length;i++){
            if(children[i].children) {
                item = walkChildren(id, children[i]);
                if(item) return item;
            }
        }
    };

    Menu.get = function(menuId){
        return _menus[ menuId ];
    };

    return Menu;

}]);