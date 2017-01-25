
/**
 *                                                  NE NOTIFICATIONS
 * ***************************************************************************************************************************
 */

/*
 * @example:
 * notifications.warning('Title','message', [timeout in ms]);
 */

angular.module('neNotifications',['neLoading'])
.factory('neNotifications', ['$timeout', function($timeout){
    var notifications = this;
    notifications.timeout = 3000; // default timeout
    notifications.queue = [];
    notifications.changeListeners = [];
    
    notifications.fireListeners = function(){
        for(var i=0;i<notifications.changeListeners.length;i++){
            (function(i){
                $timeout(function(){
                    notifications.changeListeners[i](notifications.queue);
                }, 0 ,false);
            })(i);
        }
    };
    
    notifications.add = 
    notifications.show = 
    notifications.create = function(type, title, text, icon, timeout) {
        var opts = {};
        
        // create(type, title, text, timeout)
        if(arguments.length === 4 && typeof arguments[3] !== 'string'){
            timeout = arguments[3];
            icon = '';
        }
        
        // create(type, text, timeout)
        else if(arguments.length === 3 && typeof arguments[2] !== 'string'){
            timeout = arguments[2];
            text = arguments[1];
            title = '';
        }
        
        // create(text, timeout)
        else if(arguments.length === 2 && typeof arguments[2] !== 'string'){
            timeout = arguments[1];
            text = arguments[0];
            title = '';
            type = 'info';
        }
        
        // create(type, text)
        else if(arguments.length === 2 && typeof arguments[2] === 'string'){
            text = arguments[1];
            title = '';
        }
        
        // create(opts)
        else if(arguments.length === 1 && angular.isObject(arguments[0])){
            opts = arguments[0];
            type = opts.type;
            title = opts.title;
            icon = opts.icon;
            text = opts.text;
            timeout = opts.timeout;
        }
        
        if(type==='error' || type==='danger') {
            type='danger';
        }
        
        function destroy(){
            notifications.remove(this.id);
        }
        
        function update(n){
            n = n || {};
            delete n.id;
            var existsOnIndex = notifications.getIndex(this.id);
            if(existsOnIndex > -1) notifications.queue[ existsOnIndex ] = angular.merge(this, n);
            notifications.fireListeners();
            return this;
        }
        
        function postpone(mseconds){
            var n = this;
            if(n.timeoutPromise) $timeout.cancel(n.timeoutPromise);
            if(!n.fixed && typeof mseconds === 'number') {
                var remainTime = n.timeout - (new Date().getTime() - n.showTime);
                remainTime = remainTime < 0 ? 0 : remainTime;
                n.showTime = new Date().getTime();
                n.timeout = remainTime + mseconds;
                n.timeoutPromise = $timeout(function(){
                    notifications.remove(n.id);
                }, n.timeout, false);
            }
        }
        
        var nId = new Date().getTime() + Math.floor((Math.random() * 100) + 1);
        var n = angular.merge(opts, {
            id: opts.id || nId,
            type: type,
            title: title,
            icon: icon,
            text: text,
            timeout: 0,
            fixed: false,
            close: destroy,
            hide: destroy,
            destroy: destroy,
            update: update,
            postpone: postpone
        });
        n.include = opts.bodyTemplateUrl || opts.include;
        
        var existsOnIndex = notifications.getIndex(n.id);
        if(existsOnIndex > -1) notifications.queue[ existsOnIndex ] = n;
        else notifications.queue.push(n);
        notifications.fireListeners();
        
        if(timeout !== false && timeout !== 0) {
            n.timeout = parseInt(timeout, 10);
            n.showTime = new Date().getTime();
            n.timeoutPromise = $timeout(function(){
                notifications.remove(n.id);
            }, n.timeout || notifications.timeout, false);
        }
        else n.fixed = true;
        
        return n;
    };
    
    function unifyArguments(title, text, timeout, args){
        if(args.length === 2 && typeof args[1] !== 'string') { 
            timeout = args[1]; 
            text = args[0]; 
            title = '';
        }
    }
    
    notifications.error = 
    notifications.danger = notifications.danger = function(title, text, timeout){
        unifyArguments(title, text, timeout, arguments);
        return this.show('error', title, text, 'fa fa-exclamation-circle fa-2x', timeout!==undefined ? timeout : notifications.timeout * 2);
    };
    notifications.success = function(title, text, timeout){
        unifyArguments(title, text, timeout, arguments);
        return this.show('success', title, text, 'fa fa-check-circle fa-2x', timeout);
    };
    notifications.warning = function(title, text, timeout){
        unifyArguments(title, text, timeout, arguments);
        return this.show('warning', title, text, 'fa fa-warning fa-2x', timeout);
    };
    notifications.info = function(title, text, timeout){
        unifyArguments(title, text, timeout, arguments);
        return this.show('info', title, text, 'fa fa-info-circle fa-2x', timeout);
    };
    
    notifications.getIndex = function(nId){
        for(var i=0;i<notifications.queue.length;i++){
            if(notifications.queue[i].id === nId) {
                return i;
            }
        }
    };
    
    notifications.get = function(nId){
        return notifications.queue[ notifications.getIndex(nId) ];
    };
    
    notifications.remove = notifications.hide = function(nId){
        var index = notifications.getIndex(nId);
        if(index === -1) return;
        
        notifications.queue.splice(index,1);
        notifications.fireListeners();
    };
    
    return notifications;
}])
.controller('NeNotificationsCtrl', [ '$scope', 'neNotifications', function($scope, notify){
    
    notify.changeListeners.push(function(queue){
        $scope.notifications = queue;
        $scope.$digest();
    });

}])
.directive('neNotificationsContainer',[function(){
    return {
        templateUrl:'neNotifications/container.html'
    };
}])
.run(['$templateCache', function($templateCache){
    $templateCache.put('neNotifications/container.html',
                       '<div class="notification-container" ng-controller="NeNotificationsCtrl">'+
                       '    <div ng-show="true" class="ng-hide">'+
                       '        <div ng-repeat="n in notifications" class="alert alert-{{n.type}}" ng-class="{expanded:n.expanded}" ng-click="n.fixed=true;n.postpone()" ng-mouseenter="n.postpone()" ng-mouseleave="n.postpone(1000)">'+
                       '            <i class="alert-pin fa fa-thumb-tack" ng-if="n.fixed"></i>'+
                       '            <i class="alert-expand fa" ng-class="{\'fa-expand\':!n.expanded,\'fa-compress\':n.expanded}" ng-click="n.expanded=!n.expanded;n.fixed=true"></i>'+
                       '            <table style="width:100%;word-wrap:break-word" class="table-fixed">'+
                       '                <tr>'+
                       '                    <td style="width:40px">'+
                       '                        <i class="{{n.icon}}"></i>'+
                       '                    </td>'+
                       '                    <td style="padding:0px 5px">'+
                       '                        <div class="notification-content" ng-if="!n.include">'+
                       '                            <strong ng-if="n.title"><span ne-bind-html="{{n.title|translate}}"></span><br></strong>'+
                       '                            <span ne-bind-html="{{n.text|translate}}"></span>'+
                       '                        </div>'+
                       '                        <div ng-if="n.include" ng-include="n.include"></div>'+
                       '                    </td>'+
                       '                    <td style="width:20px">'+
                       '                        <a href="" ng-click="n.close()"><i class="fa fa-fw fa-times"></i></a>'+
                       '                    </td>'+
                       '                </tr>'+
                       '            </table>'+
                       '        </div>'+
                       '        <div class="alert alert-default" ng-show="loading" ng-controller="NeLoadingCtrl">'+
                       '            <table style="width:100%">'+
                       '                <tr>'+
                       '                    <td style="width:40px">'+
                       '                        <i class="fa fa-fw fa-spinner fa-spin fa-2x"></i>'+
                       '                    </td>'+
                       '                    <td style="padding:0px 5px">'+
                       '                        <strong>{{::\'Loading...\'|translate}}</strong>'+
                       '                    </td>'+
                       '                </tr>'+
                       '            </table>'+
                       '        </div>'+
                       '    </div>'+
                       '</div>');
}]);

