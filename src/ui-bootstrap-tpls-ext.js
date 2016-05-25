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
    $templateCache.put("uib/template/datetimepicker/popup.html",
                       "<ul class=\"uib-datepicker-popup dropdown-menu\" dropdown-nested ng-if=\"isOpen\" style=\"max-height:450px;display: block\" ng-style=\"{top: position.top+'px', left: position.left+'px'}\" ng-keydown=\"keydown($event)\" ng-click=\"$event.stopPropagation()\">\n" +
                       "	<li ng-transclude></li>\n" +
                       "	<li style=\"text-align:center\"><div style=\"display:inline-block;\" uib-timepicker ng-model=\"date\" ng-change=\"dateSelection(date)\" readonly-input=\"$parent.$parent.readonlyInput\" show-seconds=\"$parent.$parent.showSeconds\" hour-step=\"$parent.$parent.hourStep\" minute-step=\"$parent.$parent.minuteStep\" show-meridian=\"$parent.$parent.showMeridian\" min=\"$parent.$parent.min\" max=\"$parent.$parent.max\"></div></li>\n" +
                       "	<li ng-if=\"showButtonBar\" style=\"padding:10px 9px 2px\" class=\"uib-button-bar\">\n" +
                       //"		<span class=\"btn-group pull-left\">\n" +
                       //"			<button type=\"button\" class=\"btn btn-sm btn-info uib-datepicker-current\" ng-click=\"$parent.$parent.$parent.setNow()\" ng-disabled=\"isDisabled('today')\">{{ getText('current') }}</button>\n" +
                       //"			<button type=\"button\" class=\"btn btn-sm btn-danger uib-clear\" ng-click=\"$parent.$parent.$parent.setNull()\">{{ getText('clear') }}</button>\n" +
                       //"		</span>\n" +
                       "		<button type=\"button\" class=\"btn btn-sm btn-success pull-right uib-close\" ng-click=\"close()\">{{ getText('close') }}</button>\n" +
                       "	</li>\n" +
                       "</ul>\n" +
                       "");
}])
.directive('uibDatetimepickerPopup',['uibDatepickerPopupConfig', function(datepickerPopupConfig){
    return {
        restrict: 'A',
        require: 'ngModel',
        replace: true,
        template: '<input uib-datepicker-popup="{{dateFormat}}" close-on-date-selection="false" datepicker-popup-template-url="uib/template/datetimepicker/popup.html">',
        link: function(scope, element, attrs, ngModel){
            var defaultFormat = 'yyyy-MM-dd HH:mm:ss';
            
            // timepicker options, that can be attributes
            scope.readonlyInput = attrs.readonlyInput; // (Defaults: false) : Whether user can type inside the hours & minutes input.
            scope.hourStep = attrs.hourStep || 1;  // (Defaults: 1) : Number of hours to increase or decrease when using a button.
            scope.minuteStep = attrs.minuteStep || 1;  // (Defaults: 1) : Number of minutes to increase or decrease when using a button.
            scope.showMeridian = attrs.showMeridian || datepickerPopupConfig.showMeridian;  // (Defaults: false) : Whether to display 12H or 24H mode.
            scope.min = attrs.min; // (Defaults: undefined) : Minimum time a user can select
            scope.max = attrs.max; // (Defaults: undefined) : Maximum time a user can select
            scope.showSeconds = attrs.showSeconds;
            scope.dateFormat = attrs.uibDatetimepickerPopup || datepickerPopupConfig.datetimepickerPopup || defaultFormat;
            
            // hidden timepicker options
            // template-url (Defaults: template/timepicker/timepicker.html) : Add the ability to override the template used on the component.
            // meridians (Defaults: null) : Meridian labels based on locale. To override you must supply an array like ['AM', 'PM'].
            // mousewheel (Defaults: true) : Whether user can scroll inside the hours & minutes input to increase or decrease it's values.
            // arrowkeys (Defaults: true) : Whether user can use up/down arrowkeys inside the hours & minutes input to increase or decrease it's values.
            // show-spinners (Defaults: true) : Shows spinner arrows above and below the inputs
        }
    };
}])

// FIX: keyboard nav when dropdown menu is not in DOM, if(elems[self.selectedOption]) elems[self.selectedOption].focus();
.controller('UibDropdownController', ['$scope', '$element', '$attrs', '$parse', 'uibDropdownConfig', 'uibDropdownService', '$animate', '$uibPosition', '$document', '$compile', '$templateRequest', function($scope, $element, $attrs, $parse, dropdownConfig, uibDropdownService, $animate, $position, $document, $compile, $templateRequest) {
    var self = this,
        scope = $scope.$new(), // create a child scope so we are not polluting original one
        templateScope,
        appendToOpenClass = dropdownConfig.appendToOpenClass,
        openClass = dropdownConfig.openClass,
        getIsOpen,
        setIsOpen = angular.noop,
        toggleInvoker = $attrs.onToggle ? $parse($attrs.onToggle) : angular.noop,
        appendToBody = false,
        appendTo = null,
        keynavEnabled = false,
        selectedOption = null,
        body = $document.find('body');

    $element.addClass('dropdown');

    this.init = function() {
        if ($attrs.isOpen) {
            getIsOpen = $parse($attrs.isOpen);
            setIsOpen = getIsOpen.assign;

            $scope.$watch(getIsOpen, function(value) {
                scope.isOpen = !!value;
            });
        }

        if (angular.isDefined($attrs.dropdownAppendTo)) {
            var appendToEl = $parse($attrs.dropdownAppendTo)(scope);
            if (appendToEl) {
                appendTo = angular.element(appendToEl);
            }
        }

        appendToBody = angular.isDefined($attrs.dropdownAppendToBody);
        keynavEnabled = angular.isDefined($attrs.keyboardNav);

        if (appendToBody && !appendTo) {
            appendTo = body;
        }

        if (appendTo && self.dropdownMenu) {
            appendTo.append(self.dropdownMenu);
            $element.on('$destroy', function handleDestroyEvent() {
                self.dropdownMenu.remove();
            });
        }
    };

    this.toggle = function(open) {
        scope.isOpen = arguments.length ? !!open : !scope.isOpen;
        if (angular.isFunction(setIsOpen)) {
            setIsOpen(scope, scope.isOpen);
        }

        return scope.isOpen;
    };

    // Allow other directives to watch status
    this.isOpen = function() {
        return scope.isOpen;
    };

    scope.getToggleElement = function() {
        return self.toggleElement;
    };

    scope.getAutoClose = function() {
        return $attrs.autoClose || 'always'; //or 'outsideClick' or 'disabled'
    };

    scope.getElement = function() {
        return $element;
    };

    scope.isKeynavEnabled = function() {
        return keynavEnabled;
    };

    scope.focusDropdownEntry = function(keyCode) {
        var elems = self.dropdownMenu ? //If append to body is used.
            angular.element(self.dropdownMenu).find('a') :
        $element.find('ul').eq(0).find('a');

        switch (keyCode) {
            case 40: {
                if (!angular.isNumber(self.selectedOption)) {
                    self.selectedOption = 0;
                } else {
                    self.selectedOption = self.selectedOption === elems.length - 1 ?
                        self.selectedOption :
                    self.selectedOption + 1;
                }
                break;
            }
            case 38: {
                if (!angular.isNumber(self.selectedOption)) {
                    self.selectedOption = elems.length - 1;
                } else {
                    self.selectedOption = self.selectedOption === 0 ?
                        0 : self.selectedOption - 1;
                }
                break;
            }
        }
        if(elems[self.selectedOption]) elems[self.selectedOption].focus();
    };

    scope.getDropdownElement = function() {
        return self.dropdownMenu;
    };

    scope.focusToggleElement = function() {
        if (self.toggleElement) {
            self.toggleElement[0].focus();
        }
    };

    scope.$watch('isOpen', function(isOpen, wasOpen) {
        if (appendTo && self.dropdownMenu) {
            var pos = $position.positionElements($element, self.dropdownMenu, 'bottom-left', true),
                css,
                rightalign;

            css = {
                top: pos.top + 'px',
                display: isOpen ? 'block' : 'none'
            };

            rightalign = self.dropdownMenu.hasClass('dropdown-menu-right');
            if (!rightalign) {
                css.left = pos.left + 'px';
                css.right = 'auto';
            } else {
                css.left = 'auto';
                css.right = window.innerWidth -
                    (pos.left + $element.prop('offsetWidth')) + 'px';
            }

            // Need to adjust our positioning to be relative to the appendTo container
            // if it's not the body element
            if (!appendToBody) {
                var appendOffset = $position.offset(appendTo);

                css.top = pos.top - appendOffset.top + 'px';

                if (!rightalign) {
                    css.left = pos.left - appendOffset.left + 'px';
                } else {
                    css.right = window.innerWidth -
                        (pos.left - appendOffset.left + $element.prop('offsetWidth')) + 'px';
                }
            }

            self.dropdownMenu.css(css);
        }

        var openContainer = appendTo ? appendTo : $element;
        var hasOpenClass = openContainer.hasClass(appendTo ? appendToOpenClass : openClass);

        if (hasOpenClass === !isOpen) {
            $animate[isOpen ? 'addClass' : 'removeClass'](openContainer, appendTo ? appendToOpenClass : openClass).then(function() {
                if (angular.isDefined(isOpen) && isOpen !== wasOpen) {
                    toggleInvoker($scope, { open: !!isOpen });
                }
            });
        }

        if (isOpen) {
            if (self.dropdownMenuTemplateUrl) {
                $templateRequest(self.dropdownMenuTemplateUrl).then(function(tplContent) {
                    templateScope = scope.$new();
                    $compile(tplContent.trim())(templateScope, function(dropdownElement) {
                        var newEl = dropdownElement;
                        self.dropdownMenu.replaceWith(newEl);
                        self.dropdownMenu = newEl;
                    });
                });
            }

            scope.focusToggleElement();
            uibDropdownService.open(scope, $element);
        } else {
            if (self.dropdownMenuTemplateUrl) {
                if (templateScope) {
                    templateScope.$destroy();
                }
                var newEl = angular.element('<ul class="dropdown-menu"></ul>');
                self.dropdownMenu.replaceWith(newEl);
                self.dropdownMenu = newEl;
            }

            uibDropdownService.close(scope, $element);
            self.selectedOption = null;
        }

        if (angular.isFunction(setIsOpen)) {
            setIsOpen($scope, isOpen);
        }
    });
}]);