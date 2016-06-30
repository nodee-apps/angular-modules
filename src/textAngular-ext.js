
// TODO: Text Color, Text BG Color

angular.module('textAngular.ext', ['textAngularSetup', 'neModals'])
.value('taOptions', {
    forceTextAngularSanitize: true,
    keyMappings : [],
    toolbar: [
        ['undo', 'redo'],
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'quote', 'table'],
        ['bold', 'italics', 'underline', 'strikeThrough', 'ul', 'ol'],
        ['color', 'bgColor', 'clear'],
        ['justifyLeft','justifyCenter','justifyRight','justifyFull','indent','outdent'],
        ['html', 'insertImage', 'insertLink', 'insertVideo'] // 'wordcount', 'charcount'
    ],
    classes: {
        focussed: "focussed",
        toolbar: "btn-toolbar",
        toolbarGroup: "btn-group btn-group-xs",
        toolbarButton: "btn btn-default",
        toolbarButtonActive: "active",
        disabled: "disabled",
        textEditor: 'form-control',
        htmlEditor: 'form-control'
    },
    defaultTagAttributes : {
        a: {target:""}
    },
    setup: {
        // wysiwyg mode
        textEditorSetup: function($element){ /* Do some processing here */ },
        // raw html
        htmlEditorSetup: function($element){ /* Do some processing here */ }
    },
    defaultFileDropHandler: function(file, insertAction){
//        var reader = new FileReader();
//        if(file.type.substring(0, 5) === 'image'){
//            reader.onload = function() {
//                if(reader.result !== '') insertAction('insertImage', reader.result, true);
//            };
//
//            reader.readAsDataURL(file);
//            // NOTE: For async procedures return a promise and resolve it when the editor should update the model.
//            return true;
//        }
        return false;
    }
})
.run(['$templateCache', function($templateCache) {
    $templateCache.put('textAngular/insert-link-modal.html',
                       '<div>'+
                       '    <div>'+
                       '        <input type="text" class="form-control" ng-model="modal.link" placeholder="http://" />'+
                       '    </div>'+
                       '    <div class="text-right margin-top-lg">'+
                       '        <button class="btn btn-default" ng-click="modal.close()">{{::\'Cancel\'|translate}}</button>'+
                       '        <button class="btn btn-mini btn-primary" ng-disabled="!modal.link" ng-click="modal.insertLink(modal.link);modal.close()">{{::\'Insert\'|translate}}</button>'+
                       '    </div>'+
                       '</div>');
    
    
    
    $templateCache.put('textAngular/insert-table-modal.html',
                       '<div>'+
                       '    <div>'+
                       '        <label>{{::\'Columns\'|translate}}</label><br>'+
                       '        <input type="number" class="form-control" ng-model="modal.cols"><br>'+
                       '        '+
                       '        <label>{{::\'Rows\'|translate}}</label><br>'+
                       '        <input type="number" class="form-control" ng-model="modal.rows">'+
                       '    </div>'+
                       '    <div class="text-right margin-top-lg">'+
                       '        <button class="btn btn-default btn-mini" ng-click="modal.close()">{{::\'Cancel\'|translate}}</button>'+
                       '        <button class="btn btn-mini btn-primary" ng-click="modal.insertTable(modal.cols || 2, modal.rows || 2);modal.close()">{{::\'Insert\'|translate}}</button>'+
                       '    </div>'+
                       '</div>');
    
    $templateCache.put('textAngular/change-color-dropdown.html',
                       '<div class="btn-group" style="float:left;" uib-dropdown>'+
                       '    <button class="btn btn-default btn-xs" uib-dropdown-toggle ng-click="storeSelection()" ng-disabled="isDisabled()">'+
                       '        <i class="fa {{icon}}"></i><i class="fa fa-caret-down"></i>'+
                       '    </button>'+
                       '    <ul class="dropdown-menu">'+
                       '        <li ng-repeat="c in colors" style="float:left;float:left;margin:2px;">'+
                       '            <a href="" style="border:1px solid black;display:block;width:15px;height:15px;padding:0px;background-color:{{c}}"'+
                       '               ng-click="setColor(c)">&nbsp;</a>'+
                       '        </li>'+
                       '    </ul>'+
                       '</div>');
}])
.run(['$templateCache', '$window', 'taRegisterTool', 'taTranslations', 'taSelection', 'taToolFunctions', '$sanitize', 'taOptions','taTools','neModals', function($templateCache, $window, taRegisterTool, taTranslations, taSelection, taToolFunctions, $sanitize, taOptions, taTools, neModals){
    
    taTools.clear.iconclass = 'fa fa-eraser';
    taTools.clear.action = function(){
        this.$editor().wrapSelection('removeFormat', null);
    };
    
    taTools.insertLink.action = function(deferred, restoreSelection){
        var ta = this;

        neModals.create({
            id: 'textAngular.insertLink',
            title: 'Insert Link',
            templateUrl: 'textAngular/insert-link-modal.html',
            removeOnClose: true,
            link:'http://',
            onClose: function(){
                if(!this.inserted){
                    restoreSelection();
                    deferred.resolve();
                }
            },
            insertLink: function(link){
                this.inserted = true;
                restoreSelection();
                if(link && link !== '' && link !== 'http://') {
                    ta.$editor().wrapSelection('createLink', link, true);
                }
                deferred.resolve();
            }
        });

        return false;
    };
    
    taTools.insertImage.action = function(deferred, restoreSelection){
        var ta = this;

        neModals.create({
            id: 'textAngular.insertImage',
            title: 'Insert Image',
            templateUrl: 'textAngular/insert-link-modal.html',
            removeOnClose: true,
            link:'http://',
            onClose: function(){
                if(!this.inserted){
                    restoreSelection();
                    deferred.resolve();
                }
            },
            insertLink: function(link){
                this.inserted = true;
                restoreSelection();
                if(link && link !== '' && link !== 'http://') {
                    ta.$editor().wrapSelection('insertImage', link, true);
                }
                deferred.resolve();
            }
        });

        return false;
    };
    
    taTools.insertVideo.action = function(deferred, restoreSelection){
        
        neModals.create({
            id: 'textAngular.insertVideo',
            title: 'Insert Youtube Video',
            templateUrl: 'textAngular/insert-link-modal.html',
            removeOnClose: true,
            link:'https://',
            onClose: function(){
                if(!this.inserted){
                    restoreSelection();
                    deferred.resolve();
                }
            },
            insertLink: function(link){
                this.inserted = true;
                var videoId;
                restoreSelection();
                
                if(link && link !== '' && link !== 'https://') {
                    videoId = taToolFunctions.extractYoutubeVideoId(link);
                    if(videoId){
                        var urlLink = "https://www.youtube.com/embed/" + videoId;
                        var embed = '<img class="ta-insert-video" src="https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg" ta-insert-video="' + urlLink + '" contenteditable="false" allowfullscreen="true" frameborder="0" />';
                        ta.$editor().wrapSelection('insertHTML', embed, true);
                    }
                }
                deferred.resolve();
            }
        });
        
        return false;
    },
    
    taTools.insertLink.onElementSelect.action = function(event, $element, editorScope){
        // setup the editor toolbar
        // Credit to the work at http://hackerwins.github.io/summernote/ for this editbar logic
        event.preventDefault();
        editorScope.displayElements.popover.css('width', '436px');
        var container = editorScope.displayElements.popoverContainer;
        container.empty();
        container.css('line-height', '28px');
        var link = angular.element('<a href="' + $element.attr('href') + '" target="_blank">' + $element.attr('href') + '&nbsp;<i class="fa fa-mail-forward"></i></a>');
        link.css({
            'display': 'inline-block',
            'max-width': '200px',
            'overflow': 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'vertical-align': 'middle'
        });
        container.append(link);
        var buttonGroup = angular.element('<div class="btn-group pull-right">');
        var reLinkButton = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on" title="' + taTranslations.editLink.reLinkButton.tooltip + '"><i class="fa fa-edit icon-edit"></i></button>');
        reLinkButton.on('click', function(event){
            event.preventDefault();

            neModals.create({
                id: 'textAngular.insertLink',
                title: 'Insert Link',
                templateUrl: 'textAngular/insert-link-modal.html',
                removeOnClose: true,
                link: $element.attr('href'),
                insertLink: function(link){
                    if(link && link !== '' && link !== 'http://') {
                        $element.attr('href', link);
                        editorScope.updateTaBindtaTextElement();
                    }
                    editorScope.hidePopover();
                }
            });
        });
        buttonGroup.append(reLinkButton);
        var targetToggle = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on"><i class="fa fa-external-link"></i></button>');
        if($element.attr('target') === '_blank'){
            targetToggle.addClass('active');
        }
        targetToggle.on('click', function(event){
            event.preventDefault();
            $element.attr('target', ($element.attr('target') === '_blank') ? '' : '_blank');
            targetToggle.toggleClass('active');
            editorScope.updateTaBindtaTextElement();
        });
        buttonGroup.append(targetToggle);
        var unLinkButton = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on" title="' + taTranslations.editLink.unLinkButton.tooltip + '"><i class="fa fa-unlink icon-unlink"></i></button>');
        // directly before this click event is fired a digest is fired off whereby the reference to $element is orphaned off
        unLinkButton.on('click', function(event){
            event.preventDefault();
            $element.replaceWith($element.contents());
            editorScope.updateTaBindtaTextElement();
            editorScope.hidePopover();
        });
        buttonGroup.append(unLinkButton);
        container.append(buttonGroup);
        editorScope.showPopover($element);
    };
    
    taRegisterTool('table', {
        iconclass: 'fa fa-table',
        tooltiptext: 'Table',
        action: function(deferred, restoreSelection){
            var ta = this;

            neModals.create({
                id: 'textAngular.insertTable',
                title: 'Insert Table',
                templateUrl: 'textAngular/insert-table-modal.html',
                removeOnClose: true,
                cols:2,
                rows:2,
                onClose: function(){
                    console.warn('inserted', this.inserted);
                    if(!this.inserted){
                        restoreSelection();
                        deferred.resolve();
                    }
                },
                insertTable: function(cols, rows){
                    this.inserted = true;
                    restoreSelection();
                    if(cols > 0 && rows > 0) {
                        var tableHTML = createTableHTML(cols, rows);
                        ta.$editor().wrapSelection('insertHTML', tableHTML, true);
                    }
                    deferred.resolve();
                }
            });

            return false;
        }
    });
    
    function createTableHTML(cols, rows){
        if ((rows > 0) && (cols > 0)) {
            var tableHTML = '<table><thead><tr>';

            for (var j=0; j < cols; j++) {
                tableHTML += '<th>col'+ (j+1) +'</th>';
            }
            tableHTML += '</tr></thead><tbody>';

            for (var i=0; i < rows; i++) {
                tableHTML += '<tr>';
                for (var j=0; j < cols; j++) {
                    tableHTML += '<td>row'+ (i+1) +'</td>';
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</tbody></table>';
            return tableHTML;
        }
    }
    
    var colors = ['#ffffff','#ffccc9','#ffce93','#fffc9e','#ffffc7','#9aff99','#96fffb','#cdffff','#cbcefb','#cfcfcf','#fd6864','#fe996b','#fffe65','#fcff2f','#67fd9a','#38fff8','#68fdff','#9698ed','#c0c0c0','#fe0000','#f8a102','#ffcc67','#f8ff00','#34ff34','#68cbd0','#34cdf9','#6665cd','#9b9b9b','#cb0000','#f56b00','#ffcb2f','#ffc702','#32cb00','#00d2cb','#3166ff','#6434fc','#656565','#9a0000','#ce6301','#cd9934','#999903','#009901','#329a9d','#3531ff','#6200c9','#343434','#680100','#963400','#986536','#646809','#036400','#34696d','#00009b','#303498','#000000','#330001','#643403','#663234','#343300','#013300','#003532','#010066','#340096'];
    
    taRegisterTool('color', {
        display: $templateCache.get('textAngular/change-color-dropdown.html'),
        class:' ',
        icon:'fa-font',
        colors: colors,
        storeSelection: function(){
            this.selection = $window.rangy.saveSelection();
        },
        setColor: function(color){
            $window.rangy.restoreSelection(this.selection);
            this.$editor().wrapSelection('foreColor', color);
        },
        action: function(){
            return true;
        }
    });
    
    taRegisterTool('bgColor', {
        display: $templateCache.get('textAngular/change-color-dropdown.html'),
        class:' ',
        icon:'fa-magic',
        colors: colors,
        storeSelection: function(){
            this.selection = $window.rangy.saveSelection();
        },
        setColor: function(color){
            $window.rangy.restoreSelection(this.selection);
            this.$editor().wrapSelection('backColor', color);
        },
        action: function(){
            return true;
        }
    });
    
}]);