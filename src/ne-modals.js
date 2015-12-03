
/**
 *                                                  NE MODALS
 * ***************************************************************************************************************************
 */

/*
 * @example:
 * modals.create({
      id:'account.changePassword',
      title:'Change your password',
      templateUrl:'views/areas/account/changepass.html',
      
      - modal text if include not used
      text: 'modal text',
      
      - modal html if include not used
      html: '<p>My Modal Text</p>',
      
      - generated buttons, when include not set
      buttons:[{ text:'Cancel', disabled:false, css:'btn btn-default', click:function(){} },
               { text:'Ok', disabled:false, css:'btn btn-primary', click:function(){} }],
               
      
      - custom method can be accessed from modal scope (modal.changePass) 
      changePass: function(oldPass, newPass){
          changePass.post({ oldPass:oldPass, newPass:newPass }, function(data){
              notify.show('Password changed.', 'success');
              modals.get('account.changePassword').hide();
          });
      }
  });
 *
 *
 */

angular.module('neModals', [])
.factory('neModals',['$timeout','$sce', function($timeout, $sce){
  
  var modals = {
    items:{},
    defaults:{
      visible:false,
      backdrop:true,
      backdropOpacity:0.4,
      css:'',
      removeOnClose:false,
      destroyOnClose:false,
      showAfterCreate:true,
      title:'modal title',
      zIndex:1040,
      text:'',
      html:'',
      include:'', // alias bodyTemplateUrl
      buttons:[{ text:'Cancel', disabled:false, css:'btn-default', click:function(){} },
               { text:'Ok', disabled:false, css:'btn-primary', click:function(){} }]
    },
    opened:0,
    changeListeners: [],
    fireChangeListeners: function(){
      for(var i=0;i<this.changeListeners.length;i++){
        (function(i){
          $timeout(function(){
            modals.changeListeners[i](modals.items);
          }, 0, false);
        })(i);
      }
    }
  };
  
  function Modal(settings){
    
    settings = settings || modals.defaults;
    
    for(var key in settings){
      this[key] = settings[key];
    }
    
    this.id = settings.id || ('modal_' + Object.keys(modals.items).length);
    this.backdrop = true;
    if(settings.backdrop===false) this.backdrop = false;
    this.backdropOpacity = this.backdropOpacity || modals.defaults.backdropOpacity;
    this.css = this.css || modals.defaults.css;
    this.zIndex = modals.defaults.zIndex;
    this.showAfterCreate = (this.showAfterCreate===undefined) ? true : this.showAfterCreate;
    this.removeOnClose = (this.removeOnClose===undefined) ? true : this.removeOnClose;
    this.destroyOnClose = (this.destroyOnClose===undefined) ? true : this.destroyOnClose;
    this.html = this.html ? $sce.trustAsHtml(this.html) : '';
    this.include = this.include || this.templateUrl || this.bodyTemplateUrl;
    
    this.show = this.open = function(){
      if(this.visible) return; // do not open already opened modal
      
      this.visible = true;
      
      // bootstrap scroll fix, TODO:move to directive
      if(modals.opened === 0)
        angular.element(document.getElementsByTagName('body')).addClass('modal-open');
      
      modals.opened++;
      this.zIndex = modals.defaults.zIndex + (11*modals.opened);
      
      modals.fireChangeListeners();
    };
    
    this.hide = this.close = function(){
      if(!this.visible) return; // do not close already closed modal
      
      this.visible = false;
      modals.opened--;
      
      if(this.removeOnClose && this.destroyOnClose) modals.remove(this.id);
      
      // bootstrap scroll fix, TODO:move to directive
      if(modals.opened === 0){
        angular.element(document.getElementsByTagName('body')).removeClass('modal-open');
      }
      modals.fireChangeListeners();
      if(typeof this.onClose === 'function') this.onClose();
    };
    
    // register or overwrite modal
    modals.items[this.id] = this;
    
    if(this.showAfterCreate) this.show();
    else modals.fireChangeListeners();
    
    return this;
  }
  
  modals.create = function(settings){
    return new Modal(settings);
  };
  
  modals.get = function(id){
    return modals.items[id];
  };
  
  modals.remove = function(id){
    delete modals.items[id];
  };
  
  return modals;
  
}])
.controller('NeModalsCtrl', ['$scope', 'neModals', function($scope, modals){
  modals.changeListeners.push(function(modals){
    $scope.modals = modals;
    $scope.$digest();
  });
}])
.directive('neModalsContainer',[function(){
    return {
        templateUrl:'neModals/container.html'
    };
}])
.run(['$templateCache', function($templateCache){
    $templateCache.put('neModals/container.html',
                       '<div ng-controller="NeModalsCtrl">'+
                       '    <div ng-repeat="(id,modal) in modals">'+
                       '        <div class="modal ng-hide" ng-show="modal.visible" style="z-index:{{modal.zIndex}};">'+
                       '            <div class="modal-dialog {{modal.css}}" ng-class="{\'modal-full\':modal.wide,\'modal-lg\':modal.large||modal.lg,\'modal-xs\':modal.small||modal.xs}">'+
                       '                <div class="modal-content">'+
                       '                    <div class="modal-header">'+
                       '                        <button class="close" ng-click="modal.hide()"><i class="fa fa-times fa-fw fa-lg"></i></button>'+
                       '                        <button class="close" ng-click="modal.wide = !modal.wide">'+
                       '                            <i style="font-size:15px;margin-right:5px;" class="fa fa-fw" ng-class="{\'fa-expand\':!modal.wide,\'fa-compress\':modal.wide}"></i>'+
                       '                        </button>'+
                       '                        <h4 class="modal-title">{{modal.title|translate}}</h4>'+
                       '                    </div>'+
                       '                    <div class="modal-body">'+
                       '                        {{modal.text|translate}}'+
                       '                        <div ng-bind-html="modal.html"></div>'+
                       '                        <div ng-include="modal.include"></div>'+
                       '                    </div>'+
                       '                    <div class="modal-footer" ng-show="modal.buttons">'+
                       '                        <button ng-repeat="button in modal.buttons" type="button" ng-disabled="button.disabled" class="{{button.css}}" ng-click="button.click()">{{button.text|translate}}</button>'+
                       '                    </div>'+
                       '                </div>'+
                       '            </div>'+
                       '        </div>'+
                       '        <div class="modal-backdrop in" ng-show="modal.visible && modal.backdrop" ng-style="{\'z-index\':modal.zIndex-10,\'opacity\':modal.opacity}"></div>'+
                       '    </div>'+
                       '</div>');
}]);