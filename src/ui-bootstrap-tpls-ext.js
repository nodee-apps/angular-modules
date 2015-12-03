/**
 *                                                  ANGULAR UI BOOTSTRAP - EXTENDED TEMPLATES
 * ***************************************************************************************************************************
 */

angular.module('ui.bootstrap.ext', ['ui.bootstrap'])
.config(['uibDatepickerPopupConfig', function(datepickerPopupConfig){
    datepickerPopupConfig.datetimepickerPopup = 'dd.MM.yyyy HH:mm';
    datepickerPopupConfig.showMeridian = false;
}])
.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/datetimepicker/popup.html",
    "<ul class=\"dropdown-menu\" ng-if=\"isOpen\" style=\"max-height:450px;display: block\" ng-style=\"{top: position.top+'px', left: position.left+'px'}\" ng-keydown=\"keydown($event)\" ng-click=\"$event.stopPropagation()\">\n" +
    "	<li ng-transclude></li>\n" +
    "	<li style=\"text-align:center\"><div style=\"display:inline-block;\" uib-timepicker ng-model=\"date\" ng-change=\"dateSelection(date)\" readonly-input=\"$parent.$parent.readonlyInput\" hour-step=\"$parent.$parent.hourStep\" minute-step=\"$parent.$parent.minuteStep\" show-meridian=\"$parent.$parent.showMeridian\" min=\"$parent.$parent.min\" max=\"$parent.$parent.max\"></div></li>\n" +
    "	<li style=\"padding:10px 9px 2px\">\n" +
    //"		<span ng-if=\"showButtonBar\" class=\"btn-group pull-left\">\n" +
    //"			<button type=\"button\" class=\"btn btn-sm btn-info\" ng-click=\"select('today')\" ng-disabled=\"isDisabled('today')\">{{ getText('current') }}</button>\n" +
    //"			<button type=\"button\" class=\"btn btn-sm btn-danger\" ng-click=\"select(null)\">{{ getText('clear') }}</button>\n" +
    //"		</span>\n" +
    "		<button type=\"button\" class=\"btn btn-sm btn-success btn-block\" ng-click=\"$parent.$parent.done ? $parent.$parent.done(date) : close()\">{{ getText('close') }}</button>\n" +
    "	</li>\n" +
    "</ul>\n" +
    "");
}])
.directive('uibDatetimepickerPopup',['dateFilter', 'dateParser', 'uibDatepickerPopupConfig', function(dateFilter, dateParser, datepickerPopupConfig){
    return {
        restrict: 'A',
        require: 'ngModel',
        replace: true,
        template: '<input uib-datepicker-popup="{{dateFormat}}" close-on-date-selection="false" uib-datepicker-popup-template-url="template/datetimepicker/popup.html">',
        link: function(scope, element, attrs, ngModel){
            var dateFormat;
            var isHtml5DateInput = false;
            var defaultFormat = 'yyyy-MM-ddTHH:mm:ss.sss';
            
            //if(attrs.done || attrs.onDone) scope.done = function(date) {
            //    scope.date = date;
            //    scope.$apply(attrs.done || attrs.onDone);
            //}
            
            // timepicker options, that can be attributes
            scope.readonlyInput = attrs.readonlyInput; // (Defaults: false) : Whether user can type inside the hours & minutes input.
            scope.hourStep = attrs.hourStep || 1;  // (Defaults: 1) : Number of hours to increase or decrease when using a button.
            scope.minuteStep = attrs.minuteStep || 1;  // (Defaults: 1) : Number of minutes to increase or decrease when using a button.
            scope.showMeridian = attrs.showMeridian || datepickerPopupConfig.showMeridian;  // (Defaults: false) : Whether to display 12H or 24H mode.
            scope.min = attrs.min; // (Defaults: undefined) : Minimum time a user can select
            scope.max = attrs.max; // (Defaults: undefined) : Maximum time a user can select
            
            // hidden timepicker options
            // template-url (Defaults: template/timepicker/timepicker.html) : Add the ability to override the template used on the component.
            // meridians (Defaults: null) : Meridian labels based on locale. To override you must supply an array like ['AM', 'PM'].
            // mousewheel (Defaults: true) : Whether user can scroll inside the hours & minutes input to increase or decrease it's values.
            // arrowkeys (Defaults: true) : Whether user can use up/down arrowkeys inside the hours & minutes input to increase or decrease it's values.
            // show-spinners (Defaults: true) : Shows spinner arrows above and below the inputs
            
            if (datepickerPopupConfig.html5Types[attrs.type]) {
              dateFormat = datepickerPopupConfig.html5Types[attrs.type];
              isHtml5DateInput = true;
            } else {
              dateFormat = attrs.datetimepickerPopup || datepickerPopupConfig.datetimepickerPopup || defaultFormat;
              attrs.$observe('datetimepickerPopup', function(value, oldValue) {
                  var newDateFormat = value || datepickerPopupConfig.datetimepickerPopup || defaultFormat;
                  // Invalidate the $modelValue to ensure that formatters re-run
                  // FIXME: Refactor when PR is merged: https://github.com/angular/angular.js/pull/10764
                  if (newDateFormat !== dateFormat) {
                    dateFormat = newDateFormat;
                    scope.dateFormat = dateFormat;
                    ngModel.$modelValue = null;
      
                    if (!dateFormat) {
                      throw new Error('datepickerPopup must have a date format specified.');
                    }
                  }
              });
            }
      
            if (!dateFormat) {
              throw new Error('datepickerPopup must have a date format specified.');
            }
            
            scope.dateFormat = dateFormat;
        }
    };
}])
// fixed keyboard nav if dropdown menu missing error
.decorator('uibKeyboardNavDirective', ['$delegate', function($delegate){
    var directiveFromThisModule;
    for(var i=0;i<$delegate.length;i++) {
        if($delegate[i].$$moduleName === 'ui.bootstrap.ext') directiveFromThisModule = $delegate[i];
    }
    
    return [ directiveFromThisModule ];
}])
.directive('uibKeyboardNav', function() {
    return {
        restrict: 'A',
        require: '?^uibDropdown',
        link: function(scope, element, attrs, dropdownCtrl) {
            element.bind('keydown', function(e) {
                if ([38, 40].indexOf(e.which) !== -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // var elems = dropdownCtrl.dropdownMenu.find('a');
                    var elems = element.find('ul').find('a');
                    
                    switch (e.which) {
                        case (40): { // Down
                            if (!angular.isNumber(dropdownCtrl.selectedOption)) {
                                dropdownCtrl.selectedOption = 0;
                            } else {
                                dropdownCtrl.selectedOption = dropdownCtrl.selectedOption === elems.length -1 ?
                                    dropdownCtrl.selectedOption : dropdownCtrl.selectedOption + 1;
                            }
                            break;
                        }
                        case (38): { // Up
                            if (!angular.isNumber(dropdownCtrl.selectedOption)) {
                                dropdownCtrl.selectedOption = elems.length - 1;
                            } else {
                                dropdownCtrl.selectedOption = dropdownCtrl.selectedOption === 0 ?
                                    0 : dropdownCtrl.selectedOption - 1;
                            }
                            break;
                        }
                    }
                    if(elems[dropdownCtrl.selectedOption]) elems[dropdownCtrl.selectedOption].focus();
                }
            });
        }
    };
})
