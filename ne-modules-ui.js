
/**
 *                                                  NE CONTENT EDITORS
 * ***************************************************************************************************************************
 */

angular.module('neContentEditors',[])
.factory('neMarkdown', ['$document','NeRemarked', 'neMarked', function($document, ReMarked, marked){
    
    var md = {}; // markdown instance
    
    var reMarkedOptions = {
        link_list:false,	// render links as references, create link list as appendix
        h1_setext:false,	// underline h1 headers
        h2_setext:false,     // underline h2 headers
        h_atx_suf:false,    // header suffixes (###)
        gfm_code:false,    // gfm code blocks (```)
        li_bullet:"*",      // list item bullet style
        hr_char:"-",      // hr style
        indnt_str:"    ",   // indentation string
        bold_char:"*",      // char used for strong
        emph_char:"_",      // char used for em
        gfm_del:true,     // ~~strikeout~~ for <del>strikeout</del>
        gfm_tbls:true,     // markdown-extra tables
        tbl_edges:false,    // show side edges on tables
        hash_lnks:false,    // anchors w/hash hrefs as links
        br_only:false    // avoid using "  " as line break indicator
    };
    var reMarker = new ReMarked(reMarkedOptions);
    
    md.parseHTML = function(htmlString){
	   return reMarker.render(htmlString || '');
    };
    
    var markedOptions = {
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: false
    };
    marked.setOptions(markedOptions);
    
    
    md.renderHTML = function(mdString){
        return marked(mdString || '');
    };
    
    // editor methods
    function isAlreadyWrapped(selection, before, after){
        var beforeSel = selection.inputValue.substring(selection.start - before.length, selection.start);
        var afterSel = selection.inputValue.substring(selection.end, selection.end + after.length);
        return (beforeSel===before && afterSel===after);
    }
    
    function wrapText(before, after, defaultValue, mode){
        mode = mode || 'toggle'; // 'add', 'remove'
        
        return function(selection){
            var value = '';
            before = before || '';
            after = after || '';
            
            if(selection && (selection.end > selection.start) && mode!=='replace'){
                if(mode==='remove' || (mode==='toggle' && isAlreadyWrapped(selection, before, after))){
                    // remove before & after
                    value = selection.inputValue.substring(0, selection.start - before.length) + selection.value + selection.inputValue.substring(selection.end + after.length, selection.inputValue.length);
                    selection.select(selection.start - before.length, selection.end - before.length);
                }
                else {
                    // add before & after
                    value = before + selection.value + after;
                    value = selection.inputValue.substring(0, selection.start) + value + selection.inputValue.substring(selection.end, selection.inputValue.length);
                    selection.select(selection.start + before.length, selection.end + before.length);
                }
            }
            else if(selection && (defaultValue || defaultValue==='')) {
                value = selection.inputValue.substring(0, selection.start) + before + defaultValue + after + selection.inputValue.substring(selection.end, selection.inputValue.length);
                selection.select(selection.start + before.length, selection.start + defaultValue.length + before.length);
            }
            
            return value;
        };
    }
    
    
    md.editor = {
        // TODO: undo, redo
        //undo: formatDoc('undo'),
        //redo: formatDoc('redo'),

        bold: wrapText('**','**','bold text'),
        italic: wrapText('*','*','italic text'),
        strikethrough: wrapText('~~','~~','strikethrough text'),
        h1: wrapText('\n# ','','headline 1'),
        h2: wrapText('\n## ','','headline 2'),
        h3: wrapText('\n### ','','headline 3'),
        h4: wrapText('\n#### ','','headline 4'),
        h5: wrapText('\n##### ','','headline 5'),
        h6: wrapText('\n###### ','','headline 6'),
        ol: wrapText('\n1. ','','numbered list'),
        ul: wrapText('\n- ','','bulleted list'),
        indent: wrapText(' ','','','replace'),
        dedent: wrapText(' ','','','remove'),
        blocquote: wrapText('\n> ','','blocquote text'),
        hr: wrapText('\n\n-----\n\n','','','replace'),

        link: function(selection, url, name){ // selection, [url || usePrompt]
            if(!(url || url==='')){
                url = prompt('Please enter link url','http://');
            }
            if(url) return wrapText('', '[ ' +(name || 'link text')+ ' ]( ' +url+ ' )' ,'','replace')(selection);
            else return '';
        },

        image: function(selection, url){ // selection, [url || usePrompt]
                if(!(url || url==='')){
                    url = prompt('Please enter image url','http://');
                }
                if(url) return wrapText('', '![]( ' +url+ ' "")' ,'','replace')(selection);
                else return '';
        },
        table: function(selection, cols, rows){
            cols = parseInt(cols, 10);
            rows = parseInt(rows, 10);
            if(cols>0 && rows>0) return wrapText('', tableMD(cols, rows),'','add')(selection);
            else return selection.inputValue;
        }
    };
    
    function tableMD(cols, rows){
        var mdTable = '\n';

        for(var r=1;r<rows+3;r++){
            for(var c=1;c<cols+1;c++){
                if(c===1) mdTable+='\n';
                else mdTable+=' | ';

                if(r===1) mdTable+='col '+c;
                else if(r===2) mdTable+='-----';
                else mdTable+='row '+(r-2);
            }
        }

        //return '\n\ncol 1 | col 2 | col 3' +
        //'\n----- | ----- | -----' +
        //'\nrow 1 | row 1 | row 1' +
        //'\nrow 2 | row 2 | row 2' +
        //'\nrow 3 | row 3 | row 3\n';

        return mdTable+'\n';
    }
    
    return md;
}])
.controller('NeMdCtrl', ['$scope', 'neMarkdown', function($scope, markdown){
    $scope.editor = markdown.editor;
}])
.controller('NeWsCtrl', ['$scope', 'neWysiwyg', function($scope, wysiwyg){
    $scope.editor = wysiwyg.editor;
}])
.factory('neWysiwyg', ['$document', 'neModals', function($document, modals){

    function insertNodeAtSelection(selection, insertNode){
        // get current selection
        var sel = window.getSelection();

        // get the first range of the selection
        // (there's almost always only one range)
        var range = selection.range;

        // deselect everything
        sel.removeAllRanges();

        // remove content of current selection from document
        range.deleteContents();

        // get location of current selection
        var container = range.startContainer;
        var pos = range.startOffset;

        // make a new range for the new selection
        range=document.createRange();

        if (container.nodeType===3 && insertNode.nodeType===3) {

            // if we insert text in a textnode, do optimized insertion
            container.insertData(pos, insertNode.nodeValue);

            // put cursor after inserted text
            range.setEnd(container, pos+insertNode.length);
            range.setStart(container, pos+insertNode.length);
        }
        else {
            var afterNode;
            if (container.nodeType===3) {

                // when inserting into a textnode
                // we create 2 new textnodes
                // and put the insertNode in between

                var textNode = container;
                container = textNode.parentNode;
                var text = textNode.nodeValue;

                // text before the split
                var textBefore = text.substr(0,pos);
                // text after the split
                var textAfter = text.substr(pos);

                var beforeNode = document.createTextNode(textBefore);
                afterNode = document.createTextNode(textAfter);

                // insert the 3 new nodes before the old one
                container.insertBefore(afterNode, textNode);
                container.insertBefore(insertNode, afterNode);
                container.insertBefore(beforeNode, insertNode);

                // remove the old node
                container.removeChild(textNode);    
            }
            else {
                // else simply insert the node
                afterNode = container.childNodes[pos];
                container.insertBefore(insertNode, afterNode);
            }

            range.setEnd(afterNode, 0);
            range.setStart(afterNode, 0);
        }

        sel.addRange(range);
    }
    
    
    function formatDoc(sCmd, sValue){
        return function(selection){
            $document[0].execCommand(sCmd, false, sValue);
            //selection.select(selection.start, selection.end);
            return selection.parent.html();
        };
    }
    
    var colors = ['#ffffff','#ffccc9','#ffce93','#fffc9e','#ffffc7','#9aff99','#96fffb','#cdffff','#cbcefb','#cfcfcf','#fd6864','#fe996b','#fffe65','#fcff2f','#67fd9a','#38fff8','#68fdff','#9698ed','#c0c0c0','#fe0000','#f8a102','#ffcc67','#f8ff00','#34ff34','#68cbd0','#34cdf9','#6665cd','#9b9b9b','#cb0000','#f56b00','#ffcb2f','#ffc702','#32cb00','#00d2cb','#3166ff','#6434fc','#656565','#9a0000','#ce6301','#cd9934','#999903','#009901','#329a9d','#3531ff','#6200c9','#343434','#680100','#963400','#986536','#646809','#036400','#34696d','#00009b','#303498','#000000','#330001','#643403','#663234','#343300','#013300','#003532','#010066','#340096'];
    var fontSizes = [
        {name: 'Extra Small', css: 'xx-small', value: '1'},
        {name: 'Small', css: 'x-small', value: '2'},
        {name: 'Medium', css: 'small', value: '3'},
        {name: 'Large', css: 'medium', value: '4'},
        {name: 'Extra Large', css: 'large', value: '5'},
        {name: 'Huge', css: 'x-large', value: '6'}
    ];
    
    var editor = {
        undo: formatDoc('undo'),
        redo: formatDoc('redo'),

        bold: formatDoc('bold'),
        italic: formatDoc('italic'),
        strikethrough: formatDoc('strikeThrough'),
        underline: formatDoc('underline'),
        quote: formatDoc('quote'),

        h1: formatDoc('formatblock','<h1>'),
        h2: formatDoc('formatblock','<h2>'),
        h3: formatDoc('formatblock','<h3>'),
        h4: formatDoc('formatblock','<h4>'),
        h5: formatDoc('formatblock','<h5>'),
        h6: formatDoc('formatblock','<h6>'),

        fontSizes: fontSizes,
        fontSize: function(selection, size){
            return formatDoc('fontsize', size)(selection);
        },
	
        colors: colors,
        color: function(selection, color){
            return formatDoc('forecolor', color)(selection);
        },
        bgColor: function(selection, color){
            return formatDoc('hilitecolor', color)(selection);
        },

        justifyLeft: formatDoc('justifyleft'),
        justifyCenter: formatDoc('justifycenter'),
        justifyRight: formatDoc('justifyright'),
        justifyFull: formatDoc('justifyfull'),

        ol: formatDoc('insertorderedlist'),
        ul: formatDoc('insertunorderedlist'),
        indent: formatDoc('indent'),
        outdent: formatDoc('outdent'),

        unlink: formatDoc('unlink'),
        link: function(selection, url, name){ // selection, [url || usePrompt]
            if(!(url || url==='')){
                url = prompt('Please enter link url','http://');
            }
            if(url) {
                var link = angular.element('<a href="' +url+ '">' +(name || url)+ '</a>');
                insertNodeAtSelection(selection, link[0]);
                return selection.parent.html();
            }
            else return '';
        },
	
        image: function(selection, url){ // selection, [url || usePrompt]
            if(!(url || url==='')){
                    url = prompt('Please enter image url','http://');
            }
            if(url) {
                var img = angular.element('<img src="' +url+ '">');
                insertNodeAtSelection(selection, img[0]);
                return selection.parent.html();
            }
            else return '';
        },
	
        table: function(selection, cols, rows){
            rows = parseInt(rows,10);
            cols = parseInt(cols,10);
            var doc = $document[0];

            if ((rows > 0) && (cols > 0)) {
                var table = doc.createElement('table');
                var thead = doc.createElement('thead');
                var tbody = doc.createElement('tbody');
                var th,tr,td,br;

                tr = doc.createElement('tr');
                for (var j=0; j < cols; j++) {
                    th = doc.createElement('th');
                    th.innerHTML = 'col '+(j+1);
                    br = doc.createElement('br');
                    th.appendChild(br);
                    tr.appendChild(th);
                }
                thead.appendChild(tr);

                for (var i=0; i < rows; i++) {
                    tr = doc.createElement('tr');
                    for (var j=0; j < cols; j++) {
                        td = doc.createElement('td');
                        td.innerHTML = 'row '+(i+1);
                        br = doc.createElement('br');
                        td.appendChild(br);
                        tr.appendChild(td);
                    }
                    tbody.appendChild(tr);
                }
                table.appendChild(thead);
                table.appendChild(tbody);      
                insertNodeAtSelection(selection, table);
            }

            return selection.parent.html();
        },

        hr: formatDoc('inserthorizontalrule')

        // TODO:
        // blocquote: wrapText('\n> ','','blocquote text'),
    };
    
    this.editor = editor;
    
    return this;
}])
.directive('neContenteditable', ['$sce', function($sce) {
    return {
	restrict: 'A', // only activate on element attribute
	require: '?ngModel', // get a hold of NgModelController
	link: function(scope, element, attrs, ngModel) {
	    if(!ngModel) return; // do nothing if no ng-model
        if(!attrs['contenteditable']) element.attr('contenteditable', 'true');
	    
	    // Specify how UI should be updated
	    ngModel.$render = function() {
		  element.html(ngModel.$viewValue || '');
	    };
	    
	    // Listen for change events to enable binding
	    element.on('blur keyup change', function() {
		  scope.$apply(read);
	    });
	    read(true); // initialize
	    
	    // Write data to the model
	    function read(firstTime) {
            var html = element.html();
            // When we clear the content editable the browser leaves a <br> behind
            // If strip-br attribute is provided then we strip this out
            if(attrs.stripBr && html === '<br>') {
                html = '';
            }

            // set model value from inner html only if value is not already set
            if((firstTime && html) || !firstTime) ngModel.$setViewValue(html);
	    }
	}
    };
}])
.directive('neSelectionModel', [function(){
    return {
        restrict:'A',
        require:'^ngModel',
        scope:{ neSelectionModel:'=' },
        link: function(scope, element, attrs, ctrl){
            if(element[0].nodeName !== 'TEXTAREA' && attrs.contenteditable!=='true'){
                throw new Error('neSelectionModel directive can be used only on <textarea> or contentEditable="true" element');
            }
            
            function TextAreaSelection(){

                function setSelection(e, start, end){
                    e.focus();
                    if(e.setSelectionRange)
                    e.setSelectionRange(start, end);
                    else if(e.createTextRange) {
                        e = e.createTextRange();
                        e.collapse(true);
                        e.moveEnd('character', end);
                        e.moveStart('character', start);
                        e.select();
                    }
                }

                function getSelection(){
                    var textarea = this;
                    var selStart = textarea.selectionStart;
                    var selEnd = textarea.selectionEnd;

                    scope.$apply(function(){
                        scope.neSelectionModel = {
                            parent: angular.element(textarea),
                            value: textarea.value.substring(selStart, selEnd),
                            inputValue: textarea.value,
                            start: selStart,
                            end: selEnd,
                            select: function(start, end){
                            setTimeout(function(){
                                setSelection(textarea, start, end);
                                getSelection.call(textarea);
                            },0);
                            }
                        };
                    });
                }

              this.setSelection = setSelection;
              this.getSelection = getSelection;
            }
            
            function closestElement(el, fn) {
                while (el) {
                    if (fn(el)) return el; 
                    el = el.parentNode;
                }
            }

            function ContentEditSelection(element){

                function setSelection(e, start, end){
                    // TODO: implement restore selection on change
                    //var range = document.createRange();
                    //range.setStart(e, start);
                    //range.setEnd(e, end);
                    ////range.collapse(true);
                    //var sel = window.getSelection();
                    //sel.removeAllRanges();
                    //sel.addRange(range);
                    //e.focus();
                    // http://stackoverflow.com/questions/16095155/javascript-contenteditable-set-cursor-caret-to-index
                    // http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity
                    // or use rangy
                }

                function getSelection(){
                    var elm = this;
                    var doc = closestElement(angular.element(elm)[0], function(elm){ return elm.tagName === 'HTML'; }).parentNode;
                    var sel = doc.getSelection();
                    var selStart = sel.getRangeAt(0).startOffset;
                    var selEnd = sel.getRangeAt(0).endOffset;
                    var parent = angular.element(elm);

                    scope.$apply(function(){
                        scope.neSelectionModel = {
                            range: sel.getRangeAt(0),
                            parent: parent,
                            value: parent.html().substring(selStart, selEnd),
                            inputValue: parent.html(),

                            start: selStart,
                            startElement: sel.getRangeAt(0).startContainer,

                            end: selEnd,
                            endElement: sel.getRangeAt(0).endContainer,

                            select: function(start, end, startElement, endElement){
                                var startElm = startElement || this.startElement;
                                var endElm = endElement || this.endElement;

                                setTimeout(function(){
                                    setSelection(elm, start, end, startElm, endElm);
                                    //getSelection.call(elm);
                                },0);
                            }
                        }
                    });
                }

                this.setSelection = setSelection;
                this.getSelection = getSelection;
            }

            var selModel = element[0].nodeName === 'TEXTAREA' ? new TextAreaSelection() : new ContentEditSelection();
            element.on('mouseup keyup', selModel.getSelection);
            scope.$on('$destroy', function(){
                    element.unbind('mouseup keyup', selModel.getSelection);
                    scope.neSelectionModel = null;
                });
           }
      };
}])
.factory('NeRemarked', [function(){

    /**
    * Copyright (c) 2013, Leon Sorokin
    * All rights reserved. (MIT Licensed)
    *
    * reMarked.js - DOM > markdown
    */

    var ReMarked = function(opts) {

        var links = [];
        var cfg = {
            link_list:	false,			// render links as references, create link list as appendix
        //  link_near:					// cite links immediately after blocks
            h1_setext:	true,			// underline h1 headers
            h2_setext:	true,			// underline h2 headers
            h_atx_suf:	false,			// header suffix (###)
        //	h_compact:	true,			// compact headers (except h1)
            gfm_code:	false,			// render code blocks as via ``` delims
            li_bullet:	"*-+"[0],		// list item bullet style
        //	list_indnt:					// indent top-level lists
            hr_char:	"-_*"[0],		// hr style
            indnt_str:	["    ","\t","  "][0],	// indentation string
            bold_char:	"*_"[0],		// char used for strong
            emph_char:	"*_"[1],		// char used for em
            gfm_del:	true,			// ~~strikeout~~ for <del>strikeout</del>
            gfm_tbls:	true,			// markdown-extra tables
            tbl_edges:	false,			// show side edges on tables
            hash_lnks:	false,			// anchors w/hash hrefs as links
            br_only:	false,			// avoid using "  " as line break indicator
            col_pre:	"col ",			// column prefix to use when creating missing headers for tables
        //	comp_style: false,			// use getComputedStyle instead of hardcoded tag list to discern block/inline
            unsup_tags: {				// handling of unsupported tags, defined in terms of desired output style. if not listed, output = outerHTML
                // no output
                ignore: "script style noscript",
                // eg: "<tag>some content</tag>"
                inline: "span sup sub i u b center big",
                // eg: "\n<tag>\n\tsome content\n</tag>"
            //	block1: "",
                // eg: "\n\n<tag>\n\tsome content\n</tag>"
                block2: "div form fieldset dl header footer address article aside figure hgroup section",
                // eg: "\n<tag>some content</tag>"
                block1c: "dt dd caption legend figcaption output",
                // eg: "\n\n<tag>some content</tag>"
                block2c: "canvas audio video iframe",
            },
            tag_remap: {				// remap of variants or deprecated tags to internal classes
                "i": "em",
                "b": "strong"
            }
        };

        extend(cfg, opts);

        function extend(a, b) {
            if (!b) return a;
            for (var i in a) {
                if (typeOf(b[i]) == "Object")
                    extend(a[i], b[i]);
                else if (typeof b[i] !== "undefined")
                    a[i] = b[i];
            }
        }

        function typeOf(val) {
            return Object.prototype.toString.call(val).slice(8,-1);
        }

        function rep(str, num) {
            var s = "";
            while (num-- > 0)
                s += str;
            return s;
        }

        function trim12(str) {
            var	str = str.replace(/^\s\s*/, ''),
                ws = /\s/,
                i = str.length;
            while (ws.test(str.charAt(--i)));
            return str.slice(0, i + 1);
        }

        function lpad(targ, padStr, len) {
            return rep(padStr, len - targ.length) + targ;
        }

        function rpad(targ, padStr, len) {
            return targ + rep(padStr, len - targ.length);
        }

        function otag(tag, e) {
            if (!tag) return "";

            var buf = "<" + tag;

            for (var attr, i = 0; i < e.attributes.length; i++) {
                attr = e.attributes.item(i);
                buf += " " + attr.nodeName + '="' + attr.nodeValue + '"';
            }

            return buf + ">";
        }

        function ctag(tag) {
            if (!tag) return "";
            return "</" + tag + ">";
        }

        function pfxLines(txt, pfx)	{
            return txt.replace(/^/gm, pfx);
        }

        function nodeName(e) {
            return (e.nodeName == "#text" ? "txt" : e.nodeName).toLowerCase();
        }

        function wrap(str, opts) {
            var pre, suf;

            if (opts instanceof Array) {
                pre = opts[0];
                suf = opts[1];
            }
            else
                pre = suf = opts;

            pre = pre instanceof Function ? pre.call(this, str) : pre;
            suf = suf instanceof Function ? suf.call(this, str) : suf;

            return pre + str + suf;
        }

        // http://stackoverflow.com/a/3819589/973988
        function outerHTML(node) {
            // if IE, Chrome take the internal method otherwise build one
            return node.outerHTML || (
              function(n){
                  var div = document.createElement('div'), h;
                  div.appendChild( n.cloneNode(true) );
                  h = div.innerHTML;
                  div = null;
                  return h;
              })(node);
        }

        this.render = function(ctr) {
            links = [];

            if (typeof ctr == "string") {
                var htmlstr = ctr;
                ctr = document.createElement("div");
                ctr.innerHTML = htmlstr;
            }
            var s = new lib.tag(ctr, null, 0);
            var re = s.rend().replace(/^[\t ]+\n/gm, "\n");
            if (cfg.link_list && links.length > 0) {
                // hack
                re += "\n\n";
                var maxlen = 0;
                // get longest link href with title, TODO: use getAttribute?
                for (var y = 0; y < links.length; y++) {
                    if (!links[y].e.title) continue;
                    var len = links[y].e.href.length;
                    if (len && len > maxlen)
                        maxlen = len;
                }

                for (var k = 0; k < links.length; k++) {
                    var title = links[k].e.title ? rep(" ", (maxlen + 2) - links[k].e.href.length) + '"' + links[k].e.title + '"' : "";
                    re += "  [" + (+k+1) + "]: " + (nodeName(links[k].e) == "a" ? links[k].e.href : links[k].e.src) + title + "\n";
                }
            }

            return re.replace(/^[\t ]+\n/gm, "\n");
        };

        var lib = {};

        lib.tag = klass({
            wrap: "",
            lnPfx: "",		// only block
            lnInd: 0,		// only block
            init: function(e, p, i)
            {
                this.e = e;
                this.p = p;
                this.i = i;
                this.c = [];
                this.tag = nodeName(e);

                this.initK();
            },

            initK: function()
            {
                var i;
                if (this.e.hasChildNodes()) {
                    // inline elems allowing adjacent whitespace text nodes to be rendered
                    var inlRe = cfg.unsup_tags.inline, n, name;

                    // if no thead exists, detect header rows or make fake cols
                    if (nodeName(this.e) == "table") {
                        if (this.e.hasChildNodes() && !this.e.tHead) {
                            var thead = document.createElement("thead");

                            var tbody0 = this.e.tBodies[0],
                                row0 = tbody0.rows[0],
                                cell0 = row0.cells[0];

                            if (nodeName(cell0) == "th")
                                thead.appendChild(row0);
                            else {
                                var hcell,
                                    i = 0,
                                    len = row0.cells.length,
                                    hrow = thead.insertRow();

                                while (i++ < len) {
                                    hcell = document.createElement("th");
                                    hcell.textContent = cfg.col_pre + i;
                                    hrow.appendChild(hcell);
                                }
                            }

                            this.e.insertBefore(thead, tbody0);
                        }
                    }

                    for (i in this.e.childNodes) {
                        if (!/\d+/.test(i)) continue;

                        n = this.e.childNodes[i];
                        name = nodeName(n);

                        // remap of variants
                        if (name in cfg.tag_remap)
                            name = cfg.tag_remap[name];

                        // ignored tags
                        if (cfg.unsup_tags.ignore.test(name))
                            continue;

                        // empty whitespace handling
                        if (name == "txt" && /^\s+$/.test(n.textContent)) {
                            // ignore if first or last child (trim)
                            if (i == 0 || i == this.e.childNodes.length - 1)
                                continue;

                            // only ouput when has an adjacent inline elem
                            var prev = this.e.childNodes[i-1],
                                next = this.e.childNodes[i+1];
                            if (prev && !nodeName(prev).match(inlRe) || next && !nodeName(next).match(inlRe))
                                continue;
                        }

                        var wrap = null;

                        if (!lib[name]) {
                            var unsup = cfg.unsup_tags;

                            if (unsup.inline.test(name))
                                name = "tinl";
                            else if (unsup.block2.test(name))
                                name = "tblk";
                            else if (unsup.block1c.test(name))
                                name = "ctblk";
                            else if (unsup.block2c.test(name)) {
                                name = "ctblk";
                                wrap = ["\n\n", ""];
                            }
                            else
                                name = "rawhtml";
                        }

                        var node = new lib[name](n, this, this.c.length);

                        if (wrap)
                            node.wrap = wrap;

                        if (node instanceof lib.a && n.href || node instanceof lib.img) {
                            node.lnkid = links.length;
                            links.push(node);
                        }

                        this.c.push(node);
                    }
                }
            },

            rend: function()
            {
                return this.rendK().replace(/\n{3,}/gm, "\n\n");		// can screw up pre and code :(
            },

            rendK: function()
            {
                var n, buf = "";
                for (var i = 0; i < this.c.length; i++) {
                    n = this.c[i];
                    buf += (n.bef || "") + n.rend() + (n.aft || "");
                }
                return buf.replace(/^\n+|\n+$/, "");
            }
        });

        lib.blk = lib.tag.extend({
            wrap: ["\n\n", ""],
            wrapK: null,
            tagr: false,
            lnInd: null,
            init: function(e, p ,i) {
                this.supr(e,p,i);

                // kids indented
                if (this.lnInd === null) {
                    if (this.p && this.tagr && this.c[0] instanceof lib.blk)
                        this.lnInd = 4;
                    else
                        this.lnInd = 0;
                }

                // kids wrapped?
                if (this.wrapK === null) {
                    if (this.tagr && this.c[0] instanceof lib.blk)
                        this.wrapK = "\n";
                    else
                        this.wrapK = "";
                }
            },

            rend: function()
            {
                return wrap.call(this, (this.tagr ? otag(this.tag, this.e) : "") + wrap.call(this, pfxLines(pfxLines(this.rendK(), this.lnPfx), rep(" ", this.lnInd)), this.wrapK) + (this.tagr ? ctag(this.tag) : ""), this.wrap);
            },

            rendK: function()
            {
                var kids = this.supr();
                // remove min uniform leading spaces from block children. marked.js's list outdent algo sometimes leaves these
                if (this.p instanceof lib.li) {
                    var repl = null, spcs = kids.match(/^[\t ]+/gm);
                    if (!spcs) return kids;
                    for (var i = 0; i < spcs.length; i++) {
                        if (repl === null || spcs[i][0].length < repl.length)
                            repl = spcs[i][0];
                    }
                    return kids.replace(new RegExp("^" + repl), "");
                }
                return kids;
            }
        });

        lib.tblk = lib.blk.extend({tagr: true});

        lib.cblk = lib.blk.extend({wrap: ["\n", ""]});

            lib.ctblk = lib.cblk.extend({tagr: true});

        lib.inl = lib.tag.extend({
            rend: function()
            {
                return wrap.call(this, this.rendK(), this.wrap);
            }
        });

            lib.tinl = lib.inl.extend({
                tagr: true,
                rend: function()
                {
                    return otag(this.tag, this.e) + wrap.call(this, this.rendK(), this.wrap) + ctag(this.tag);
                }
            });

            lib.p = lib.blk.extend({
                rendK: function() {
                    return this.supr().replace(/^\s+/gm, "");
                }
            });

            lib.list = lib.blk.extend({
                expn: false,
                wrap: [function(){return this.p instanceof lib.li ? "\n" : "\n\n";}, ""]
            });

            lib.ul = lib.list.extend({});

            lib.ol = lib.list.extend({});

            lib.li = lib.cblk.extend({
                wrap: ["\n", function(kids) {
                    return this.p.expn || kids.match(/\n{2}/gm) ? "\n" : "";			// || this.kids.match(\n)
                }],
                wrapK: [function() {
                    return this.p.tag == "ul" ? cfg.li_bullet + " " : (this.i + 1) + ".  ";
                }, ""],
                rendK: function() {
                    return this.supr().replace(/\n([^\n])/gm, "\n" + cfg.indnt_str + "$1");
                }
            });

            lib.hr = lib.blk.extend({
                wrap: ["\n\n", rep(cfg.hr_char, 3)]
            });

            lib.h = lib.blk.extend({});

            lib.h_setext = lib.h.extend({});

                cfg.h1_setext && (lib.h1 = lib.h_setext.extend({
                    wrapK: ["", function(kids) {
                        return "\n" + rep("=", kids.length);
                    }]
                }));

                cfg.h2_setext && (lib.h2 = lib.h_setext.extend({
                    wrapK: ["", function(kids) {
                        return "\n" + rep("-", kids.length);
                    }]
                }));

            lib.h_atx = lib.h.extend({
                wrapK: [
                    function(kids) {
                        return rep("#", this.tag[1]) + " ";
                    },
                    function(kids) {
                        return cfg.h_atx_suf ? " " + rep("#", this.tag[1]) : "";
                    }
                ]
            });
                !cfg.h1_setext && (lib.h1 = lib.h_atx.extend({}));

                !cfg.h2_setext && (lib.h2 = lib.h_atx.extend({}));

                lib.h3 = lib.h_atx.extend({});

                lib.h4 = lib.h_atx.extend({});

                lib.h5 = lib.h_atx.extend({});

                lib.h6 = lib.h_atx.extend({});

            lib.a = lib.inl.extend({
                lnkid: null,
                rend: function() {
                    var kids = this.rendK(),
                        href = this.e.getAttribute("href"),
                        title = this.e.title ? ' "' + this.e.title + '"' : "";

                    if (!href || href == kids || href[0] == "#" && !cfg.hash_lnks)
                        return kids;

                    if (cfg.link_list)
                        return "[" + kids + "] [" + (this.lnkid + 1) + "]";

                    return "[" + kids + "](" + href + title + ")";
                }
            });

            // almost identical to links, maybe merge
            lib.img = lib.inl.extend({
                lnkid: null,
                rend: function() {
                    var kids = this.e.alt,
                        src = this.e.getAttribute("src");

                    if (cfg.link_list)
                        return "![" + kids + "] [" + (this.lnkid + 1) + "]";

                    var title = this.e.title ? ' "'+ this.e.title + '"' : "";

                    return "![" + kids + "](" + src + title + ")";
                }
            });


            lib.em = lib.inl.extend({wrap: cfg.emph_char});

            lib.del = cfg.gfm_del ? lib.inl.extend({wrap: "~~"}) : lib.tinl.extend();

            lib.br = lib.inl.extend({
                wrap: ["", function() {
                    var end = cfg.br_only ? "<br>" : "  ";
                    // br in headers output as html
                    return this.p instanceof lib.h ? "<br>" : end + "\n";
                }]
            });

            lib.strong = lib.inl.extend({wrap: rep(cfg.bold_char, 2)});

            lib.blockquote = lib.blk.extend({
                lnPfx: "> ",
                rend: function() {
                    return this.supr().replace(/>[ \t]$/gm, ">");
                }
            });

            // can render with or without tags
            lib.pre = lib.blk.extend({
                tagr: true,
                wrapK: "\n",
                lnInd: 0
            });

            // can morph into inline based on context
            lib.code = lib.blk.extend({
                tagr: false,
                wrap: "",
                wrapK: function(kids) {
                    return kids.indexOf("`") !== -1 ? "``" : "`";	// esc double backticks
                },
                lnInd: 0,
                init: function(e, p, i) {
                    this.supr(e, p, i);

                    if (this.p instanceof lib.pre) {
                        this.p.tagr = false;

                        if (cfg.gfm_code) {
                            var cls = this.e.getAttribute("class");
                            cls = (cls || "").split(" ")[0];

                            if (cls.indexOf("lang-") === 0)			// marked uses "lang-" prefix now
                                cls = cls.substr(5);

                            this.wrapK = ["```" + cls + "\n", "\n```"];
                        }
                        else {
                            this.wrapK = "";
                            this.p.lnInd = 4;
                        }
                    }
                }
            });

            lib.table = cfg.gfm_tbls ? lib.blk.extend({
                cols: [],
                init: function(e, p, i) {
                    this.supr(e, p, i);
                    this.cols = [];
                },
                rend: function() {
                    // run prep on all cells to get max col widths
                    for (var tsec = 0; tsec < this.c.length; tsec++)
                        for (var row = 0; row < this.c[tsec].c.length; row++)
                            for (var cell = 0; cell < this.c[tsec].c[row].c.length; cell++)
                                this.c[tsec].c[row].c[cell].prep();

                    return this.supr();
                }
            }) : lib.tblk.extend();

            lib.thead = cfg.gfm_tbls ? lib.cblk.extend({
                wrap: ["\n", function(kids) {
                    var buf = "";
                    for (var i = 0; i < this.p.cols.length; i++) {
                        var col = this.p.cols[i],
                            al = col.a[0] == "c" ? ":" : " ",
                            ar = col.a[0] == "r" || col.a[0] == "c" ? ":" : " ";

                        buf += (i == 0 && cfg.tbl_edges ? "|" : "") + al + rep("-", col.w) + ar + (i < this.p.cols.length-1 || cfg.tbl_edges ? "|" : "");
                    }
                    return "\n" + trim12(buf);
                }]
            }) : lib.ctblk.extend();

            lib.tbody = cfg.gfm_tbls ? lib.cblk.extend() : lib.ctblk.extend();

            lib.tfoot = cfg.gfm_tbls ? lib.cblk.extend() : lib.ctblk.extend();

            lib.tr = cfg.gfm_tbls ? lib.cblk.extend({
                wrapK: [cfg.tbl_edges ? "| " : "", cfg.tbl_edges ? " |" : ""],
            }) : lib.ctblk.extend();

            lib.th = cfg.gfm_tbls ? lib.inl.extend({
                guts: null,
                // TODO: DRY?
                wrap: [function() {
                    var col = this.p.p.p.cols[this.i],
                        spc = this.i == 0 ? "" : " ",
                        pad, fill = col.w - this.guts.length;

                    switch (col.a[0]) {
                        case "r": pad = rep(" ", fill); break;
                        case "c": pad = rep(" ", Math.floor(fill/2)); break;
                        default:  pad = "";
                    }

                    return spc + pad;
                }, function() {
                    var col = this.p.p.p.cols[this.i],
                        edg = this.i == this.p.c.length - 1 ? "" : " |",
                        pad, fill = col.w - this.guts.length;

                    switch (col.a[0]) {
                        case "r": pad = ""; break;
                        case "c": pad = rep(" ", Math.ceil(fill/2)); break;
                        default:  pad = rep(" ", fill);
                    }

                    return pad + edg;
                }],
                prep: function() {
                    this.guts = this.rendK();					// pre-render
                    this.rendK = function() {return this.guts};

                    var cols = this.p.p.p.cols;
                    if (!cols[this.i])
                        cols[this.i] = {w: null, a: ""};		// width and alignment
                    var col = cols[this.i];
                    col.w = Math.max(col.w || 0, this.guts.length);
                    if (this.e.align)
                        col.a = this.e.align;
                },
            }) : lib.ctblk.extend();

                lib.td = lib.th.extend();

            lib.txt = lib.inl.extend({
                initK: function()
                {
                    this.c = this.e.textContent.split(/^/gm);
                },
                rendK: function()
                {
                    var kids = this.c.join("").replace(/\r/gm, "");

                    // this is strange, cause inside of code, inline should not be processed, but is?
                    if (!(this.p instanceof lib.code || this.p instanceof lib.pre)) {
                        kids = kids
                        .replace(/^\s*#/gm,"\\#")
                        .replace(/\*/gm,"\\*");
                    }

                    if (this.i == 0)
                        kids = kids.replace(/^\n+/, "");
                    if (this.i == this.p.c.length - 1)
                        kids = kids.replace(/\n+$/, "");

                    return kids;
                }
            });

            lib.rawhtml = lib.blk.extend({
                initK: function()
                {
                    this.guts = outerHTML(this.e);
                },
                rendK: function()
                {
                    return this.guts;
                }
            });

            // compile regexes
            for (var i in cfg.unsup_tags)
                cfg.unsup_tags[i] = new RegExp("^(?:" + (i == "inline" ? "a|em|strong|img|code|del|" : "") + cfg.unsup_tags[i].replace(/\s/g, "|") + ")$");
    };
    
    return ReMarked;
}])
.factory('neMarked', [function(){

    /**
     * marked - a markdown parser
     * Copyright (c) 2011-2013, Christopher Jeffrey. (MIT Licensed)
     * https://github.com/chjj/marked
     */

    ;(function() {

    /**
     * Block-Level Grammar
     */

    var block = {
      newline: /^\n+/,
      code: /^( {4}[^\n]+\n*)+/,
      fences: noop,
      hr: /^( *[-*_]){3,} *(?:\n+|$)/,
      heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
      nptable: noop,
      lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
      blockquote: /^( *>[^\n]+(\n[^\n]+)*\n*)+/,
      list: /^( *)(bull) [\s\S]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
      html: /^ *(?:comment|closed|closing) *(?:\n{2,}|\s*$)/,
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
      table: noop,
      paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
      text: /^[^\n]+/
    };

    block.bullet = /(?:[*+-]|\d+\.)/;
    block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
    block.item = replace(block.item, 'gm')
      (/bull/g, block.bullet)
      ();

    block.list = replace(block.list)
      (/bull/g, block.bullet)
      ('hr', /\n+(?=(?: *[-*_]){3,} *(?:\n+|$))/)
      ();

    block._tag = '(?!(?:'
      + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
      + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
      + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|@)\\b';

    block.html = replace(block.html)
      ('comment', /<!--[\s\S]*?-->/)
      ('closed', /<(tag)[\s\S]+?<\/\1>/)
      ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
      (/tag/g, block._tag)
      ();

    block.paragraph = replace(block.paragraph)
      ('hr', block.hr)
      ('heading', block.heading)
      ('lheading', block.lheading)
      ('blockquote', block.blockquote)
      ('tag', '<' + block._tag)
      ('def', block.def)
      ();

    /**
     * Normal Block Grammar
     */

    block.normal = merge({}, block);

    /**
     * GFM Block Grammar
     */

    block.gfm = merge({}, block.normal, {
      fences: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
      paragraph: /^/
    });

    block.gfm.paragraph = replace(block.paragraph)
      ('(?!', '(?!'
        + block.gfm.fences.source.replace('\\1', '\\2') + '|'
        + block.list.source.replace('\\1', '\\3') + '|')
      ();

    /**
     * GFM + Tables Block Grammar
     */

    block.tables = merge({}, block.gfm, {
      nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
      table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
    });

    /**
     * Block Lexer
     */

    function Lexer(options) {
      this.tokens = [];
      this.tokens.links = {};
      this.options = options || marked.defaults;
      this.rules = block.normal;

      if (this.options.gfm) {
        if (this.options.tables) {
          this.rules = block.tables;
        } else {
          this.rules = block.gfm;
        }
      }
    }

    /**
     * Expose Block Rules
     */

    Lexer.rules = block;

    /**
     * Static Lex Method
     */

    Lexer.lex = function(src, options) {
      var lexer = new Lexer(options);
      return lexer.lex(src);
    };

    /**
     * Preprocessing
     */

    Lexer.prototype.lex = function(src) {
      src = src
        .replace(/\r\n|\r/g, '\n')
        .replace(/\t/g, '    ')
        .replace(/\u00a0/g, ' ')
        .replace(/\u2424/g, '\n');

      return this.token(src, true);
    };

    /**
     * Lexing
     */

    Lexer.prototype.token = function(src, top) {
      var src = src.replace(/^ +$/gm, '')
        , next
        , loose
        , cap
        , bull
        , b
        , item
        , space
        , i
        , l;

      while (src) {
        // newline
        if (cap = this.rules.newline.exec(src)) {
          src = src.substring(cap[0].length);
          if (cap[0].length > 1) {
            this.tokens.push({
              type: 'space'
            });
          }
        }

        // code
        if (cap = this.rules.code.exec(src)) {
          src = src.substring(cap[0].length);
          cap = cap[0].replace(/^ {4}/gm, '');
          this.tokens.push({
            type: 'code',
            text: !this.options.pedantic
              ? cap.replace(/\n+$/, '')
              : cap
          });
          continue;
        }

        // fences (gfm)
        if (cap = this.rules.fences.exec(src)) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'code',
            lang: cap[2],
            text: cap[3]
          });
          continue;
        }

        // heading
        if (cap = this.rules.heading.exec(src)) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'heading',
            depth: cap[1].length,
            text: cap[2]
          });
          continue;
        }

        // table no leading pipe (gfm)
        if (top && (cap = this.rules.nptable.exec(src))) {
          src = src.substring(cap[0].length);

          item = {
            type: 'table',
            header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
            align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
            cells: cap[3].replace(/\n$/, '').split('\n')
          };

          for (i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = 'right';
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = 'center';
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = 'left';
            } else {
              item.align[i] = null;
            }
          }

          for (i = 0; i < item.cells.length; i++) {
            item.cells[i] = item.cells[i].split(/ *\| */);
          }

          this.tokens.push(item);

          continue;
        }

        // lheading
        if (cap = this.rules.lheading.exec(src)) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'heading',
            depth: cap[2] === '=' ? 1 : 2,
            text: cap[1]
          });
          continue;
        }

        // hr
        if (cap = this.rules.hr.exec(src)) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'hr'
          });
          continue;
        }

        // blockquote
        if (cap = this.rules.blockquote.exec(src)) {
          src = src.substring(cap[0].length);

          this.tokens.push({
            type: 'blockquote_start'
          });

          cap = cap[0].replace(/^ *> ?/gm, '');

          // Pass `top` to keep the current
          // "toplevel" state. This is exactly
          // how markdown.pl works.
          this.token(cap, top);

          this.tokens.push({
            type: 'blockquote_end'
          });

          continue;
        }

        // list
        if (cap = this.rules.list.exec(src)) {
          src = src.substring(cap[0].length);
          bull = cap[2];

          this.tokens.push({
            type: 'list_start',
            ordered: bull.length > 1
          });

          // Get each top-level item.
          cap = cap[0].match(this.rules.item);

          next = false;
          l = cap.length;
          i = 0;

          for (; i < l; i++) {
            item = cap[i];

            // Remove the list item's bullet
            // so it is seen as the next token.
            space = item.length;
            item = item.replace(/^ *([*+-]|\d+\.) +/, '');

            // Outdent whatever the
            // list item contains. Hacky.
            if (~item.indexOf('\n ')) {
              space -= item.length;
              item = !this.options.pedantic
                ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
                : item.replace(/^ {1,4}/gm, '');
            }

            // Determine whether the next list item belongs here.
            // Backpedal if it does not belong in this list.
            if (this.options.smartLists && i !== l - 1) {
              b = block.bullet.exec(cap[i + 1])[0];
              if (bull !== b && !(bull.length > 1 && b.length > 1)) {
                src = cap.slice(i + 1).join('\n') + src;
                i = l - 1;
              }
            }

            // Determine whether item is loose or not.
            // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
            // for discount behavior.
            loose = next || /\n\n(?!\s*$)/.test(item);
            if (i !== l - 1) {
              next = item.charAt(item.length - 1) === '\n';
              if (!loose) loose = next;
            }

            this.tokens.push({
              type: loose
                ? 'loose_item_start'
                : 'list_item_start'
            });

            // Recurse.
            this.token(item, false);

            this.tokens.push({
              type: 'list_item_end'
            });
          }

          this.tokens.push({
            type: 'list_end'
          });

          continue;
        }

        // html
        if (cap = this.rules.html.exec(src)) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: this.options.sanitize
              ? 'paragraph'
              : 'html',
            pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
            text: cap[0]
          });
          continue;
        }

        // def
        if (top && (cap = this.rules.def.exec(src))) {
          src = src.substring(cap[0].length);
          this.tokens.links[cap[1].toLowerCase()] = {
            href: cap[2],
            title: cap[3]
          };
          continue;
        }

        // table (gfm)
        if (top && (cap = this.rules.table.exec(src))) {
          src = src.substring(cap[0].length);

          item = {
            type: 'table',
            header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
            align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
            cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
          };

          for (i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = 'right';
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = 'center';
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = 'left';
            } else {
              item.align[i] = null;
            }
          }

          for (i = 0; i < item.cells.length; i++) {
            item.cells[i] = item.cells[i]
              .replace(/^ *\| *| *\| *$/g, '')
              .split(/ *\| */);
          }

          this.tokens.push(item);

          continue;
        }

        // top-level paragraph
        if (top && (cap = this.rules.paragraph.exec(src))) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'paragraph',
            text: cap[1].charAt(cap[1].length - 1) === '\n'
              ? cap[1].slice(0, -1)
              : cap[1]
          });
          continue;
        }

        // text
        if (cap = this.rules.text.exec(src)) {
          // Top-level should never reach here.
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'text',
            text: cap[0]
          });
          continue;
        }

        if (src) {
          throw new
            Error('Infinite loop on byte: ' + src.charCodeAt(0));
        }
      }

      return this.tokens;
    };

    /**
     * Inline-Level Grammar
     */

    var inline = {
      escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
      autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
      url: noop,
      tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
      link: /^!?\[(inside)\]\(href\)/,
      reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
      nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
      strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
      em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
      code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
      br: /^ {2,}\n(?!\s*$)/,
      del: noop,
      text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
    };

    inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
    inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

    inline.link = replace(inline.link)
      ('inside', inline._inside)
      ('href', inline._href)
      ();

    inline.reflink = replace(inline.reflink)
      ('inside', inline._inside)
      ();

    /**
     * Normal Inline Grammar
     */

    inline.normal = merge({}, inline);

    /**
     * Pedantic Inline Grammar
     */

    inline.pedantic = merge({}, inline.normal, {
      strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
      em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
    });

    /**
     * GFM Inline Grammar
     */

    inline.gfm = merge({}, inline.normal, {
      escape: replace(inline.escape)('])', '~|])')(),
      url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
      del: /^~~(?=\S)([\s\S]*?\S)~~/,
      text: replace(inline.text)
        (']|', '~]|')
        ('|', '|https?://|')
        ()
    });

    /**
     * GFM + Line Breaks Inline Grammar
     */

    inline.breaks = merge({}, inline.gfm, {
      br: replace(inline.br)('{2,}', '*')(),
      text: replace(inline.gfm.text)('{2,}', '*')()
    });

    /**
     * Inline Lexer & Compiler
     */

    function InlineLexer(links, options) {
      this.options = options || marked.defaults;
      this.links = links;
      this.rules = inline.normal;
      this.renderer = this.options.renderer || new Renderer;

      if (!this.links) {
        throw new
          Error('Tokens array requires a `links` property.');
      }

      if (this.options.gfm) {
        if (this.options.breaks) {
          this.rules = inline.breaks;
        } else {
          this.rules = inline.gfm;
        }
      } else if (this.options.pedantic) {
        this.rules = inline.pedantic;
      }
    }

    /**
     * Expose Inline Rules
     */

    InlineLexer.rules = inline;

    /**
     * Static Lexing/Compiling Method
     */

    InlineLexer.output = function(src, links, options) {
      var inline = new InlineLexer(links, options);
      return inline.output(src);
    };

    /**
     * Lexing/Compiling
     */

    InlineLexer.prototype.output = function(src) {
      var out = ''
        , link
        , text
        , href
        , cap;

      while (src) {
        // escape
        if (cap = this.rules.escape.exec(src)) {
          src = src.substring(cap[0].length);
          out += cap[1];
          continue;
        }

        // autolink
        if (cap = this.rules.autolink.exec(src)) {
          src = src.substring(cap[0].length);
          if (cap[2] === '@') {
            text = cap[1].charAt(6) === ':'
              ? this.mangle(cap[1].substring(7))
              : this.mangle(cap[1]);
            href = this.mangle('mailto:') + text;
          } else {
            text = escape(cap[1]);
            href = text;
          }
          out += this.renderer.link(href, null, text);
          continue;
        }

        // url (gfm)
        if (cap = this.rules.url.exec(src)) {
          src = src.substring(cap[0].length);
          text = escape(cap[1]);
          href = text;
          out += this.renderer.link(href, null, text);
          continue;
        }

        // tag
        if (cap = this.rules.tag.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.options.sanitize
            ? escape(cap[0])
            : cap[0];
          continue;
        }

        // link
        if (cap = this.rules.link.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.outputLink(cap, {
            href: cap[2],
            title: cap[3]
          });
          continue;
        }

        // reflink, nolink
        if ((cap = this.rules.reflink.exec(src))
            || (cap = this.rules.nolink.exec(src))) {
          src = src.substring(cap[0].length);
          link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
          link = this.links[link.toLowerCase()];
          if (!link || !link.href) {
            out += cap[0].charAt(0);
            src = cap[0].substring(1) + src;
            continue;
          }
          out += this.outputLink(cap, link);
          continue;
        }

        // strong
        if (cap = this.rules.strong.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.strong(this.output(cap[2] || cap[1]));
          continue;
        }

        // em
        if (cap = this.rules.em.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.em(this.output(cap[2] || cap[1]));
          continue;
        }

        // code
        if (cap = this.rules.code.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.codespan(escape(cap[2], true));
          continue;
        }

        // br
        if (cap = this.rules.br.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.br();
          continue;
        }

        // del (gfm)
        if (cap = this.rules.del.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.del(this.output(cap[1]));
          continue;
        }

        // text
        if (cap = this.rules.text.exec(src)) {
          src = src.substring(cap[0].length);
          out += escape(this.smartypants(cap[0]));
          continue;
        }

        if (src) {
          throw new
            Error('Infinite loop on byte: ' + src.charCodeAt(0));
        }
      }

      return out;
    };

    /**
     * Compile Link
     */

    InlineLexer.prototype.outputLink = function(cap, link) {
      var href = escape(link.href)
        , title = link.title ? escape(link.title) : null;

      if (cap[0].charAt(0) !== '!') {
        return this.renderer.link(href, title, this.output(cap[1]));
      } else {
        return this.renderer.image(href, title, escape(cap[1]));
      }
    };

    /**
     * Smartypants Transformations
     */

    InlineLexer.prototype.smartypants = function(text) {
      if (!this.options.smartypants) return text;
      return text
        // em-dashes
        .replace(/--/g, '\u2014')
        // opening singles
        .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
        // closing singles & apostrophes
        .replace(/'/g, '\u2019')
        // opening doubles
        .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
        // closing doubles
        .replace(/"/g, '\u201d')
        // ellipses
        .replace(/\.{3}/g, '\u2026');
    };

    /**
     * Mangle Links
     */

    InlineLexer.prototype.mangle = function(text) {
      var out = ''
        , l = text.length
        , i = 0
        , ch;

      for (; i < l; i++) {
        ch = text.charCodeAt(i);
        if (Math.random() > 0.5) {
          ch = 'x' + ch.toString(16);
        }
        out += '&#' + ch + ';';
      }

      return out;
    };

    /**
     * Renderer
     */

    function Renderer() {}

    Renderer.prototype.code = function(code, lang) {
      if (!lang) {
        return '<pre><code>'
          + escape(code, true)
          + '\n</code></pre>';
      }

      return '<pre><code class="'
        + 'lang-'
        + lang
        + '">'
        + escape(code)
        + '\n</code></pre>\n';
    };

    Renderer.prototype.blockquote = function(quote) {
      return '<blockquote>\n' + quote + '</blockquote>\n';
    };

    Renderer.prototype.html = function(html) {
      return html;
    };

    Renderer.prototype.heading = function(text, level, raw, options) {
      return '<h'
        + level
        + '>'
        + text
        + '</h'
        + level
        + '>\n';
    };

    Renderer.prototype.hr = function() {
      return '<hr>\n';
    };

    Renderer.prototype.list = function(body, ordered) {
      var type = ordered ? 'ol' : 'ul';
      return '<' + type + '>\n' + body + '</' + type + '>\n';
    };

    Renderer.prototype.listitem = function(text) {
      return '<li>' + text + '</li>\n';
    };

    Renderer.prototype.paragraph = function(text) {
      return '<p>' + text + '</p>\n';
    };

    Renderer.prototype.table = function(header, body) {
      return '<table>\n'
        + '<thead>\n'
        + header
        + '</thead>\n'
        + '<tbody>\n'
        + body
        + '</tbody>\n'
        + '</table>\n';
    };

    Renderer.prototype.tablerow = function(content) {
      return '<tr>\n' + content + '</tr>\n';
    };

    Renderer.prototype.tablecell = function(content, flags) {
      var type = flags.header ? 'th' : 'td';
      var tag = flags.align
        ? '<' + type + ' style="text-align:' + flags.align + '">'
        : '<' + type + '>';
      return tag + content + '</' + type + '>\n';
    };

    // span level renderer
    Renderer.prototype.strong = function(text) {
      return '<strong>' + text + '</strong>';
    };

    Renderer.prototype.em = function(text) {
      return '<em>' + text + '</em>';
    };

    Renderer.prototype.codespan = function(text) {
      return '<code>' + text + '</code>';
    };

    Renderer.prototype.br = function() {
      return '<br>';
    };

    Renderer.prototype.del = function(text) {
      return '<del>' + text + '</del>';
    };

    Renderer.prototype.link = function(href, title, text) {
      var out = '<a href="' + href + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += '>' + text + '</a>';
      return out;
    };

    Renderer.prototype.image = function(href, title, text) {
      var out = '<img src="' + href + '" alt="' + text + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += '>';
      return out;
    };

    /**
     * Parsing & Compiling
     */

    function Parser(options) {
      this.tokens = [];
      this.token = null;
      this.options = options || marked.defaults;
      this.options.renderer = this.options.renderer || new Renderer;
      this.renderer = this.options.renderer;
    }

    /**
     * Static Parse Method
     */

    Parser.parse = function(src, options, renderer) {
      var parser = new Parser(options, renderer);
      return parser.parse(src);
    };

    /**
     * Parse Loop
     */

    Parser.prototype.parse = function(src) {
      this.inline = new InlineLexer(src.links, this.options, this.renderer);
      this.tokens = src.reverse();

      var out = '';
      while (this.next()) {
        out += this.tok();
      }

      return out;
    };

    /**
     * Next Token
     */

    Parser.prototype.next = function() {
      return this.token = this.tokens.pop();
    };

    /**
     * Preview Next Token
     */

    Parser.prototype.peek = function() {
      return this.tokens[this.tokens.length - 1] || 0;
    };

    /**
     * Parse Text Tokens
     */

    Parser.prototype.parseText = function() {
      var body = this.token.text;

      while (this.peek().type === 'text') {
        body += '\n' + this.next().text;
      }

      return this.inline.output(body);
    };

    /**
     * Parse Current Token
     */

    Parser.prototype.tok = function() {
      switch (this.token.type) {
        case 'space': {
          return '';
        }
        case 'hr': {
          return this.renderer.hr();
        }
        case 'heading': {
          return this.renderer.heading(
            this.inline.output(this.token.text),
            this.token.depth
          );
        }
        case 'code': {
          return this.renderer.code(this.token.text, this.token.lang);
        }
        case 'table': {
          var header = ''
            , body = ''
            , i
            , row
            , cell
            , flags
            , j;

          // header
          cell = '';
          for (i = 0; i < this.token.header.length; i++) {
            flags = { header: true, align: this.token.align[i] };
            cell += this.renderer.tablecell(
              this.inline.output(this.token.header[i]),
              { header: true, align: this.token.align[i] }
            );
          }
          header += this.renderer.tablerow(cell);

          for (i = 0; i < this.token.cells.length; i++) {
            row = this.token.cells[i];

            cell = '';
            for (j = 0; j < row.length; j++) {
              cell += this.renderer.tablecell(
                this.inline.output(row[j]),
                { header: false, align: this.token.align[j] }
              );
            }

            body += this.renderer.tablerow(cell);
          }
          return this.renderer.table(header, body);
        }
        case 'blockquote_start': {
          var body = '';

          while (this.next().type !== 'blockquote_end') {
            body += this.tok();
          }

          return this.renderer.blockquote(body);
        }
        case 'list_start': {
          var body = ''
            , ordered = this.token.ordered;

          while (this.next().type !== 'list_end') {
            body += this.tok();
          }

          return this.renderer.list(body, ordered);
        }
        case 'list_item_start': {
          var body = '';

          while (this.next().type !== 'list_item_end') {
            body += this.token.type === 'text'
              ? this.parseText()
              : this.tok();
          }

          return this.renderer.listitem(body);
        }
        case 'loose_item_start': {
          var body = '';

          while (this.next().type !== 'list_item_end') {
            body += this.tok();
          }

          return this.renderer.listitem(body);
        }
        case 'html': {
          var html = !this.token.pre && !this.options.pedantic
            ? this.inline.output(this.token.text)
            : this.token.text;
          return this.renderer.html(html);
        }
        case 'paragraph': {
          return this.renderer.paragraph(this.inline.output(this.token.text));
        }
        case 'text': {
          return this.renderer.paragraph(this.parseText());
        }
      }
    };

    /**
     * Helpers
     */

    function escape(html, encode) {
      return html
        .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function replace(regex, opt) {
      regex = regex.source;
      opt = opt || '';
      return function self(name, val) {
        if (!name) return new RegExp(regex, opt);
        val = val.source || val;
        val = val.replace(/(^|[^\[])\^/g, '$1');
        regex = regex.replace(name, val);
        return self;
      };
    }

    function noop() {}
    noop.exec = noop;

    function merge(obj) {
      var i = 1
        , target
        , key;

      for (; i < arguments.length; i++) {
        target = arguments[i];
        for (key in target) {
          if (Object.prototype.hasOwnProperty.call(target, key)) {
            obj[key] = target[key];
          }
        }
      }

      return obj;
    }


    /**
     * Marked
     */

    function marked(src, opt, callback) {
      if (callback || typeof opt === 'function') {
        if (!callback) {
          callback = opt;
          opt = null;
        }

        opt = merge({}, marked.defaults, opt || {});

        var highlight = opt.highlight
          , tokens
          , pending
          , i = 0;

        try {
          tokens = Lexer.lex(src, opt)
        } catch (e) {
          return callback(e);
        }

        pending = tokens.length;

        var done = function() {
          var out, err;

          try {
            out = Parser.parse(tokens, opt);
          } catch (e) {
            err = e;
          }

          opt.highlight = highlight;

          return err
            ? callback(err)
            : callback(null, out);
        };

        return done();
      }
      try {
        if (opt) opt = merge({}, marked.defaults, opt);
        return Parser.parse(Lexer.lex(src, opt), opt);
      } catch (e) {
        e.message += '\nPlease report this to https://github.com/chjj/marked.';
        if ((opt || marked.defaults).silent) {
          return '<p>An error occured:</p><pre>'
            + escape(e.message + '', true)
            + '</pre>';
        }
        throw e;
      }
    }

    /**
     * Options
     */

    marked.options =
    marked.setOptions = function(opt) {
      merge(marked.defaults, opt);
      return marked;
    };

    marked.defaults = {
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: false,
      silent: false,
      smartypants: false,
      renderer: new Renderer
    };

    /**
     * Expose
     */

    marked.Parser = Parser;
    marked.parser = Parser.parse;

    marked.Renderer = Renderer;

    marked.Lexer = Lexer;
    marked.lexer = Lexer.lex;

    marked.InlineLexer = InlineLexer;
    marked.inlineLexer = InlineLexer.output;

    marked.parse = marked;

    if (typeof exports === 'object') {
      module.exports = marked;
    } else if (typeof define === 'function' && define.amd) {
      define(function() { return marked; });
    } else {
      this.marked = marked;
    }

    }).call(function() {
      return this || (typeof window !== 'undefined' ? window : global);
    }());
    
    
    return marked;
}]);

/*!
 * klass: a classical JS OOP façade
 * https://github.com/ded/klass
 * License MIT (c) Dustin Diaz & Jacob Thornton 2012
 */
!function(a,b){typeof define=="function"?define(b):typeof module!="undefined"?module.exports=b():this[a]=b()}("klass",function(){function f(a){return j.call(g(a)?a:function(){},a,1)}function g(a){return typeof a===c}function h(a,b,c){return function(){var d=this.supr;this.supr=c[e][a];var f=b.apply(this,arguments);return this.supr=d,f}}function i(a,b,c){for(var f in b)b.hasOwnProperty(f)&&(a[f]=g(b[f])&&g(c[e][f])&&d.test(b[f])?h(f,b[f],c):b[f])}function j(a,b){function c(){}function l(){this.init?this.init.apply(this,arguments):(b||h&&d.apply(this,arguments),j.apply(this,arguments))}c[e]=this[e];var d=this,f=new c,h=g(a),j=h?a:this,k=h?{}:a;return l.methods=function(a){return i(f,a,d),l[e]=f,this},l.methods.call(l,k).prototype.constructor=l,l.extend=arguments.callee,l[e].implement=l.statics=function(a,b){return a=typeof a=="string"?function(){var c={};return c[a]=b,c}():a,i(this,a,d),this},l}var a=this,b=a.klass,c="function",d=/xyz/.test(function(){xyz})?/\bsupr\b/:/.*/,e="prototype";return f.noConflict=function(){return a.klass=b,this},a.klass=f,f});


/**
 *                                                  NE DIRECTIVES
 * ***************************************************************************************************************************
 */

angular.module('neDirectives',['neObject'])
.directive('neInitData', [ function() {
    return {
        priority: 1000,
        restrict: 'AE',
        compile: function(){
            return {
                pre: function(scope, element, attrs){
                    if(attrs.neInitData) {
                        scope.$eval((attrs.neInitAs ? attrs.neInitAs+'=' : '')+attrs.neInitData);
                    }
                    else if(element.html()){
                        scope.$eval((attrs.neInitAs ? attrs.neInitAs+'=' : '')+element.html());
                    }
                    
                    if(attrs.neInitDone) {
                        scope.$eval(attrs.neInitDone);
                    }
                }
            };
        }
    };
}])
.service('neKeyPressHandler', [function(){
    return function(attrName, keyCode, preventDefault){
        return function(scope, element, attrs) {
            var target;

            if(element[0].nodeName === 'INPUT') target = element;
            else target = angular.element(document);

            target.bind('keydown keypress', keyPressed);
            function keyPressed(event) {
                if(event.which === keyCode) {
                    scope.$apply(function (){
                        scope.$eval(attrs[ attrName ]);
                    });
                    if(preventDefault) event.preventDefault();
                }
            }

            scope.$on('$destroy', function(){
                target.unbind('keydown keypress', keyPressed);
            });
        };
    };
}])
.directive('neKeypressEnter', [ 'neKeyPressHandler', function(keyPressHandler) {
    return keyPressHandler('neKeypressEnter', 13, true);
}])
.directive('neKeypressEscape', [ 'neKeyPressHandler', function(keyPressHandler) {
    return keyPressHandler('neKeypressEscape', 27, true);
}])
.directive('neKeypressRight', [ 'neKeyPressHandler', function(keyPressHandler) {
    return keyPressHandler('neKeypressRight', 39);
}])
.directive('neKeypressLeft', [ 'neKeyPressHandler', function(keyPressHandler) {
    return keyPressHandler('neKeypressLeft', 37);
}])
.directive('neKeypressUp', [ 'neKeyPressHandler', function(keyPressHandler) {
    return keyPressHandler('neKeypressUp', 38);
}])
.directive('neKeypressDown', [ 'neKeyPressHandler', function(keyPressHandler) {
    return keyPressHandler('neKeypressDown', 40);
}])
.directive('neKeypressBackspace', [ 'neKeyPressHandler', function(keyPressHandler) {
    return keyPressHandler('neKeypressBackspace', 8);
}])
.directive('neLoadingStart', ['$timeout', function($timeout){
    return function(scope, element, attrs) {
        if(element[0].nodeName !== 'IMG') return;

        attrs.$observe('src', function(){
            $timeout(function (){
                scope.$eval(attrs.neLoadingStart);
            });
        });
    };
}])
.directive('neLoadingEnd', ['$timeout', function($timeout){
    return function(scope, element, attrs) {
        if(element[0].nodeName !== 'IMG') return;

        element.bind('load', onLoad);
        function onLoad(event) {
            $timeout(function (){
                scope.$eval(attrs.neLoadingEnd);
            },5);
            event.preventDefault();
        }

        scope.$on('$destroy', function(){
            element.unbind('load', onLoad);
        });
    };
}])
.directive('neStatusIcon', [function() {
    return {
        restrict: 'A',
        compile: function(element, attrs){
            // create template
            var template =  '<div class="right-inner-addon">' +
                                (attrs.neStatusIcon!=='reverse' ? '<i class="fa fa-check text-success" ng-show="' +element.attr('ng-model')+ '"></i>' : '') +
                                (attrs.neStatusIcon==='reverse' ? '<i class="fa fa-times text-danger" ng-show="!' +element.attr('ng-model')+ '"></i>' : '') +
                            '</div>';
            
            // wrap element
            element.wrap(template);
            // prevent infinite wrapping
            element.removeAttr('status-icon');
        }
    };
}])
.directive('neMatchHrefPath', [ '$window','$location', function($window, $location) {
    return {
        priority:-100,
        link: function (scope, element, attrs) {
            var className = scope.$eval(attrs.neMatchHrefPath) || attrs.neMatchHrefPath;
            if(!className) return;
            
            var href;
            if(attrs.href) {
                try { href = scope.$eval(attrs.href); }
                catch(err){ href = attrs.href; }
            }
            else {
                var link = element.find('a')[0];
                href = link ? link.getAttribute('href') : null;
                if(link && href) {
                    try { href = scope.$eval(href.replace('{{','').replace('}}','')); }
                    catch(err){ href = href; }
                }
            }
            
            if(href && href.indexOf('#')===-1) {
                href = href.replace(/^http:/g,'').replace(/^https:/g,'').replace($window.location.hostname,'').replace(/\/+/g,'/');
                if(($window.location.pathname+'/').match(new RegExp('^' +href+ '[\/\#\?].*'))) {
                    element.addClass(className);
                }
                else element.removeClass(className);
            }
            else if(href) {
                href = href.match(/^([^\#]*)\#([^\#\?]*).*$/); // /catalog#/muzi
                href = href ? href[href.length-1] : null;
                if(href) scope.$on('$locationChangeSuccess', checkMatch);
                checkMatch();
            }
            
            function checkMatch(){
                if(($location.path()+'/').match(new RegExp('^' +href+ '[\/\#\?].*'))) {
                    element.addClass(className);
                }
                else element.removeClass(className);
            }
        }
    };
}])
.directive('neFile', [function() {
    return {
        restrict: 'E',
        template: '<input type="file" />',
        replace: true,
        require: 'ngModel',
        link: function(scope, element, attr, ctrl) {
            var listener = function() {
                scope.$apply(function() {
                    if(attr.multiple || attr.multiple===''){
                        var files = [];
                        for(var i=0;i<element[0].files.length;i++) files.push(element[0].files[i]);
                        ctrl.$setViewValue(files);
                    }
                    else {
                        ctrl.$setViewValue(element[0].files[0]);
                    }
                });
            };
            element.attr('accept', attr.accept);
            element.bind('change', listener);
        }
    };
}])
.service('neFileDropArea', [function(){
    this.bind = function(elm, afterDrop, readAs) { // readAsDataURL, readAsText, readAsArrayBuffer
        var dropbox = elm[0];
        var dragover = false;
        
        // Setup drag and drop handlers.
        dropbox.addEventListener('dragenter', addDragClass, false);
        dropbox.addEventListener('dragover', addDragClass, false);
        dropbox.addEventListener('dragleave', removeDragClass, false);
        dropbox.addEventListener('drop', onDrop, false);
          
        function stopDefault(e) {
            e.stopPropagation();
            e.preventDefault();
        }
        
        function addDragClass(e){
            stopDefault(e);
            if(!dragover) {
                elm.addClass('ne-dragover');
                dragover = true;
            }
        }
        
        function removeDragClass(e){
            stopDefault(e);
            elm.removeClass('ne-dragover');
            dragover = false;
        }
          
        function onDrop(e) {
            removeDragClass(e);
          
            var readFileSize = 0;
            var files = e.dataTransfer.files;
            
            var file = files[0];
            if(!file) return;
            readFileSize += file.fileSize;
            
            // Only process image files.
            // var imageType = /image.*/;
            // if (!file.type.match(imageType)) return;
            
            if(readAs){
                var reader = new FileReader();
                reader.onerror = function(e) {
                    alert('Cannot read file: ' + e.target.error);
                };
                
                // Create a closure to capture the file information.
                reader.onload = (function(aFile) {
                    return function(evt) {
                        afterDrop(evt.target.result);
                    };
                })(file);
                
                // Read in the image file as a data url.
                reader[readAs](file);
                // readAsDataURL, readAsText, readAsArrayBuffer
            }
            else afterDrop(files);
        }
        
        return {
            unbind:function(){
                dragover = null;
                
                // Remove drag and drop handlers.
                dropbox.removeEventListener('dragenter', addDragClass, false);
                dropbox.removeEventListener('dragover', addDragClass, false);
                dropbox.removeEventListener('dragleave', removeDragClass, false);
                dropbox.removeEventListener('drop', onDrop, false);
            }
        };
    };
    
    return this;
}])
.directive('neFileDropArea',['neFileDropArea', function(fileDropArea) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs, ctrl) {
            var typeRegexp = attrs.neFileDropArea ? new RegExp(attrs.neFileDropArea) : null;
            
            element.on('load', function(){
                scope.setNaturalHeight(this.naturalHeight);
                scope.setNaturalWidth(this.naturalWidth);
            });
            
            var area = fileDropArea.bind(element, function(files){
                var filesArray = [];
                var onDrop = attrs.neFileDrop || attrs.neFilesDrop || attrs.ondrop;
                for(var i=0;i<files.length;i++) {
                    if(!typeRegexp || files[i].type.match(typeRegexp)) filesArray.push(files[i]);
                }
                scope.files = filesArray;
                if(filesArray.length && onDrop) scope.$apply(onDrop);
            });
            scope.$on('$destroy', area.unbind);
        }
    };
}])
.directive('neCopy',[function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs, ctrl) {
            var original = scope.$eval(attrs.neCopy);
            var propName = scope.alias || attrs.neCopyAlias || '$copy';
            
            function rollback(){ 
                scope[ propName ] = angular.copy(original); 
            }
            
            function commit(){
                var copy = scope[ propName ];
                
                // replace all original properties by copy
                for(var key in copy) {
                    if(copy.hasOwnProperty(key) && !(key[0]==='$' && key[1]==='$')){ // dont copy $$ prefixed props
                        original[key] = copy[key];
                    }
                }
            }
            
            scope.$rollback = rollback;
            scope.$commit = commit;
            original.$commit = commit;
            original.$rollback = rollback;
            scope.$rollback();
        }
    };
}])
.directive('neFormChange',[function() {
    return {
        restrict: 'A',
        require:'^form',
        link: function(scope, element, attrs, formCtrl) {
            scope.$watch(function(){
                return formCtrl.$valid;
            }, function(isValid){
                scope.$valid = scope.$isValid = isValid;
                scope.$eval(attrs.neFormChange);
            });
        }
    };
}])
.directive('neBindHtml',['$sce', function($sce) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            attrs.$observe('neBindHtml', function(htmlText){
                element.html(htmlText);
            });
        }
    };
}])
.filter('html', ['$sce', function ($sce) { 
    return function (text) {
        return $sce.trustAsHtml(text);
    };    
}])
.filter('trusted', ['$sce', function ($sce) { // alias for html
    return function (text) {
        return $sce.trustAsHtml(text);
    };    
}]);/**
 *                                                  NE DRAG DROP
 * ***************************************************************************************************************************
 */

angular.module('neDragdrop',[])
.directive('draggable', [function() {
    return function(scope, element, attrs) {
        // this gives us the native JS object
        var el = element[0];
        
        function preventDrag(e) {
            e.preventDefault();
            return false;
        }
        
        function addDragClass(e) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('Text', this.id);
            this.classList.add('dragged');
            
            if(attrs.drag) scope.$apply(attrs.drag);
            
            return false;
        }
        
        function removeDragClass(e) {
            this.classList.remove('dragged');
            return false;
        }
        
        if(attrs.draggable === 'false'){
            el.addEventListener('dragstart', preventDrag);
            
            scope.$on('$destroy', function(){
                el.removeEventListener('dragstart', preventDrag);
            });
        }
        else {
            el.draggable = true;
            el.addEventListener('dragstart', addDragClass);
            el.addEventListener('dragend', removeDragClass);
            
            scope.$on('$destroy', function(){
                el.removeEventListener('dragstart', preventDrag);
                el.removeEventListener('dragend', removeDragClass);
            });
        }
    };
}])
.directive('droppable', [function() {
    return function(scope, element, attrs) {
        // again we need the native object
        var el = element[0];
        
        function dragover(e) {
            e.dataTransfer.dropEffect = 'move';
            // allows us to drop
            if (e.preventDefault) e.preventDefault();
            this.classList.add('dragover');
            return false;
        }
        el.addEventListener('dragover', dragover);
        
        function dragenter(e) {
            this.classList.add('dragover');
            return false;
        }
        el.addEventListener('dragenter', dragenter);
      
        function dragleave(e) {
            this.classList.remove('dragover');
            return false;
        }
        el.addEventListener('dragleave', dragleave);
      
        function drop(e) {
            // Stops some browsers from redirecting.
            if(e.stopPropagation) e.stopPropagation();
            e.preventDefault();
            
            this.classList.remove('dragover');
          
            //var binId = this.id;
            //var item = document.getElementById(e.dataTransfer.getData('Text'));
            //this.appendChild(item);
            // call the passed drop function
            
            if(attrs.drop) scope.$apply(attrs.drop);
            
            //scope.$apply(function(scope) {
            //    if(scope.drop) scope.$eval(scope.drop);
            //});
                
            return false;
        }
        el.addEventListener('drop', drop);
        
        scope.$on('$destroy', function(){
            el.removeEventListener('dragover', dragover);
            el.removeEventListener('dragenter', dragenter);
            el.removeEventListener('dragleave', dragleave);
            el.removeEventListener('drop', drop);
        });
    };
}]);
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
    
    function load(cb){
        var grid = this;
        if(!grid.interceptLoad || (grid.interceptLoad && grid.interceptLoad(grid.query)!==false)){            
            grid.disabled = true;
            grid.getResourceMethod('find')(grid.query, function(items, pagination){
                if(typeof grid.onLoad === 'function') grid.onLoad(items, pagination);
                grid.fillItems(items, pagination);
                if(cb) cb();
                grid.disabled = false;
            });
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
    
    function createItem(item,cb){
        var grid = this;
        
        grid.getResourceMethod('create', item)(item, function(data){
            grid.setPage('first', cb);
            if(typeof grid.onCreate === 'function') grid.onCreate(item);
            if(!grid.autoLoad) grid.load(cb);
        });
        return grid;
    }
    
    function updateItem(item, cb){
        var grid = this;
        grid.getResourceMethod('update', item)(item, function(data){
            var index = grid.items.indexOf(item);
            var oldItem = angular.copy(item);
            grid.items[ index ] = object.extend('data', grid.items[ index ], data);
            if(grid.onUpdate) grid.onUpdate(grid.items[ index ], oldItem);
            if(cb) cb(grid.items[ index ]);
        });
        return grid;
    }
    
    function refreshItem(item, cb){
        var grid = this;
        var idKey = grid.idKey;
        var idQuery = {};
        idQuery[ idKey ] = object.deepGet(item, idKey);
        
        grid.getResourceMethod('find', item)(idQuery, function(items, pagination){
            var index = grid.items.indexOf(item);
            grid.items[ index ] = object.extend('data', grid.items[ index ], items[0]);
            if(cb) cb(grid.items[ index ]);
        });
        return grid;
    }
    
    function removeItem(item, cb){
        var grid = this;
        grid.getResourceMethod('remove',item)(item, function(data){
            grid.items.splice(grid.items.indexOf(item), 1);
            if(grid.onRemove) grid.onRemove(item);
            if(cb) cb(item);
        });
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


/**
 *                                                  NE LOADING
 * ***************************************************************************************************************************
 */

angular.module('neLoading', [])
.constant('neLoadingDebounce', 350) // delay of changes apply, if response will be received in lower interval than debounce, loading will not emit changes
.constant('neLoadingEndDelay', 300) // delay of loading end, loading message hide will be delayed
.factory('neLoading',['$timeout','neLoadingDebounce','neLoadingEndDelay', function($timeout, debounce, endDelay) {
  var service = {
    requestCount: 0,
    isLoading: function() {
      return service.requestCount > 0;
    },
    statusTimeout:null,
    status:0,
    prevStatus:0,
    lastStart: new Date().getTime(),
    statusListeners:[],
    fireStatusListeners: function(){
      for(var i=0;i<service.statusListeners.length;i++){
        (function(i){
          $timeout(function(){
            service.statusListeners[i](service.status);
          },0,false);
        })(i);
      }
    },
    setStatus: function(percent) {
      if(service.statusTimeout) $timeout.cancel(service.statusTimeout);
      if(percent < 0) return;
      service.prevStatus = service.status+0;
      service.status = percent;
      var now = new Date().getTime();
      if(service.prevStatus === 0 && percent > 0) service.lastStart = now;
      
      if((now - service.lastStart) > debounce) service.fireStatusListeners();
        
      if(service.status > 0 && service.status < 99){
          service.statusTimeout = $timeout(function(){
              service.setStatus(randomIncrement(service.status));
        }, debounce, false);
      }
      else if(service.status >= 100){
        if((now - service.lastStart) > debounce){
            service.statusTimeout = $timeout(function(){
              service.setStatus(0);
              service.fireStatusListeners();
            }, endDelay, false);
        }
        else {
            service.status = 0;
            service.prevStatus = 0;
        }
      }
    },
    reqStarted: function(debugNotes){
        // if(service.statusTimeout) $timeout.cancel(service.statusTimeout);
        if(service.status===0) service.setStatus(1);
        //$timeout(function(){
        service.requestCount++;
        if(debugNotes) console.log(debugNotes, service.requestCount, service.status);
        //}, 0, false);
    },
    reqEnded: function(debugNotes){
        //$timeout(function(){
        if(service.requestCount>0) service.requestCount--;
        if(debugNotes) console.log(debugNotes, service.requestCount, service.status);
        if(service.requestCount === 0) service.setStatus(100);
        //}, 0, false);
    }
  };
  
  function randomIncrement(status){
    var rnd = 0;
    var stat = status / 100;
    if (stat >= 0 && stat < 0.25) {
      // Start out between 3 - 6% increments
      rnd = (Math.random() * (5 - 3 + 1) + 3) / 100;
    } else if (stat >= 0.25 && stat < 0.65) {
      // increment between 0 - 3%
      rnd = (Math.random() * 3) / 100;
    } else if (stat >= 0.65 && stat < 0.9) {
      // increment between 0 - 2%
      rnd = (Math.random() * 2) / 100;
    } else if (stat >= 0.9 && stat < 0.99) {
      // finally, increment it .5 %
      rnd = 0.005;
    } else {
      // after 99%, don't increment:
      rnd = 0;
    }
    return status + Math.ceil(100*rnd);
  }
  
  return service;
}])
.factory('neLoadingInterceptor',['$q', '$cacheFactory', 'neLoading', function($q, $cacheFactory, loading){
  function isCached(config) {
    if(!config) return false;
    var cache;
    
    if (config.method !== 'GET' || config.cache === false) {
      config.cached = false;
      return false;
    }
    
    if (config.cache === true){ //&& defaults.cache === undefined) {
      cache = $cacheFactory.get('$http');
    }
    else {
      cache = config.cache;
    }
    
    var cached = cache !== undefined ?
      cache.get(config.url) !== undefined : false;
      
    if (config.cached !== undefined && cached !== config.cached) {
      return config.cached;
    }
    config.cached = cached;
    return cached;
  }
    
  return {
    request: function(config) {
      // Check to make sure this request hasn't already been cached and that
      // the requester didn't explicitly ask us to ignore this request:
      if (!config.ignoreLoading && !isCached(config)) {
        loading.reqStarted();
      }
      return config;
    },
    
    response: function(response) {
      if(!response.config.ignoreLoading && !isCached(response.config)) {
        loading.reqEnded();
      }
      return response;
    },
    
    responseError: function(rejection) {
      if (!rejection.config.ignoreLoading && !isCached(rejection.config)) {
        loading.reqEnded();
      }
      return $q.reject(rejection);
    }
  };
}])
.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('neLoadingInterceptor');
}])
.controller('NeLoadingCtrl',['$scope', 'neLoading', function($scope, loading) {

    loading.statusListeners.push(function(status){
        $scope.status = status;
        $scope.loading = status > 0;
        $scope.$digest();
    });
}]);
/**
 *                                                  NE LOCAL
 * ***************************************************************************************************************************
 */

/*
 * very simple localization service and translate filter
 *
 * config example:
 * 
 *  app.config(['localProvider', function(localProvider){
        localProvider.language('sk-sk');
        localProvider.set('sk-sk',{
            name:'Meno',
            surname:'Priezvisko',
            dateTime:'Datum'
        });
    }])
 */
angular.module('neLocal',[])
.provider('neLocal',[function(){
    var currentLangId = 'default';
    var langs = { default:{ common:{} } };
    var currentPath = '/';
    
    this.translate = function(original){
        if(original===undefined || original===null) return '';
        var orig = original+'';
        var lang = langs[currentLangId] || {};
        lang.common = lang.common || {};
        return (lang[currentPath] ? lang[currentPath][orig] : null) || lang.common[orig] || 
               (langs.default[currentPath] ? langs.default[currentPath][orig] : null) || langs.default.common[orig] || orig || '';
    };
    
    this.setPath = function(path){
        currentPath = path;
    };
    
    this.language = function(langId){
        if(langId) currentLangId = langId;
        return currentLangId;
    };
    
    this.languages = function(langId){
        return langId ? langs[langId] : langs;
    };
    
    this.getLanguageId = function(){
        return currentLangId;
    };
    
    this.getLanguagePath = function(){
        return currentPath;
    };
    
    this.set = this.translations = function(langId, path, original, translated){
        
        langs[langId] = langs[langId] || {};
        langs[langId].common = langs[langId].common || {};
        
        if(arguments.length===4){
            langs[langId][path] = langs[langId][path] || {};
            langs[langId][path][original] = translated;
        }
        else if(arguments.length===3 && angular.isObject(original)){
            langs[langId][path] = langs[langId][path] || {};
            angular.extend(langs[langId][path], original);
        }
        else if(arguments.length===3){
            translated = arguments[2];
            original = arguments[1];
            langs[langId].common[original] = translated;
        }
        else if(arguments.length===2){
            original = arguments[1];
            var hasCommon = angular.isObject(original.common);
            angular.extend(hasCommon ? langs[langId] : langs[langId].common, original);
        }
        else throw new Error('Wrong arguments');
    };
    
    this.$get = function() {
        return this;
    };
    
    return this;
}])
.run(['$rootScope', '$location', 'neLocal', function($rootScope, $location, local){
    $rootScope.$on('$routeChangeStart', function(evt, absNewUrl, absOldUrl){
        local.setPath($location.path());
    });
}])
.filter('neTranslate', ['neLocal', function(local) {
    return function(input, expression, comparator){
        return local.translate(input);
    };
}])
// alias for neTranslate
.filter('translate', ['neLocal', function(local) {
    return function(input, expression, comparator){
        return local.translate(input);
    };
}]);
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
                       '        <div ng-repeat="n in notifications" class="alert alert-{{n.type}}" ng-click="n.fixed=true;n.postpone()" ng-mouseenter="n.postpone()" ng-mouseleave="n.postpone(1000)">'+
                       '            <i class="alert-pin fa fa-thumb-tack" ng-if="n.fixed"></i>'+
                       '            <table style="width:100%;word-wrap:break-word" class="table-fixed">'+
                       '                <tr>'+
                       '                    <td style="width:15%">'+
                       '                        <i class="{{n.icon}}"></i>'+
                       '                    </td>'+
                       '                    <td style="padding:0px 5px">'+
                       '                        <div ng-if="!n.include" style="overflow:auto;max-height:200px">'+
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
                       '                    <td style="width:15%">'+
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


/**
 *                                                  NE OBJECT
 * ***************************************************************************************************************************
 */

angular.module('neObject',[])
.factory('neObject', ['$timeout', function($timeout){
    
    var hasOwn = Object.prototype.hasOwnProperty;
    function isPlainObject(obj) {
        if (!obj || Object.prototype.toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
            return false;

        var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
        var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');
        // Not own constructor property must be Object
        if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
            return false;
        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.
        var key;
        for ( key in obj ) {}
        return key === undefined || hasOwn.call( obj, key );
    }

    function extend() {
        var options, name, src, copy, copyIsArray, clone,
            reservedInstances = this.extendReservedInstances,
            object = this,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;
        // Handle a deep copy situation
        if ( typeof target === 'boolean' || target === 'data' ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }
        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== 'object' && typeof target !== 'function') {
            target = {};
        }
        for ( ; i < length; i++ ) {
            options = arguments[ i ];
            
            if(isReservedInstance(options, reservedInstances)){
                target = options;
                return target;
            }
            
            // Only deal with non-null/undefined values
            else if ( options !== null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];
                    
                    // prevent modifying reserved instances
                    if ( isReservedInstance(copy, reservedInstances) ){
                        target[ name ] = copy;
                        continue;
                    }
                    
                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }
                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) ) ) {
                        if ( copyIsArray ) {
                            copyIsArray = false;
                            if(deep === 'data') {
                                // if data mode, do not merge arrays, just copy
                                target[ name ] = copy.slice(0);
                                continue;
                            }
                            clone = src && Array.isArray(src) ? src : [];
                        } else {
                            clone = src && isPlainObject(src) ? src : {};
                        }  
                        // Never move original objects, clone them
                        target[ name ] = object.extend( deep, clone, copy );
                    // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }
        // Return the modified object
        return target;
    }
    
    function isReservedInstance(value, reservedInstances){
        for(var i=0;i<reservedInstances.length;i++){
            if(value instanceof reservedInstances[i]) return true;
        }
        return false;
    }
    
    function deepReplace(parentObj, cb, keyPath){ // cb(keyPath, key, value)
        if(!angular.isObject(parentObj)) return;
        keyPath = keyPath || '';
        var value;
        for(var key in parentObj){
            if(angular.isObject(parentObj[key])) deepReplace(parentObj[key], cb, (keyPath==='' ? key : keyPath + '.' + key));
            value = cb((keyPath==='' ? key : keyPath + '.' + key), key, parentObj[key]);
            if(value===undefined) delete parentObj[key];
            else parentObj[key] = value;
        }
    }
    
    /**
     * Define cascading props in objects in namespace separated by dot,
     * if props are on lower level, it will create empty object
     * @param {Object} parent base object where you want add props
     * @param {String} namespace dot separated
     * @param {Object} value value to add to object prop
     * @param {String} mode if "push", it will add value to array
     * @returns {Object}  parent object after properties are added
     */
    function deepSet(parent, namespace, value, mode) {
        // if(typeof value==='string') value = value.replace(/(\r\n|\r|\n)\s*$/, ''); // replace line endings and white spaces
        var parts = namespace.split('.');
        var current = parent;
        if(namespace==='this') {
            if(mode==='push') parent.push(value);
            else parent = value.toString();
        }
        else {
            for(var i=0; i<parts.length; i++) {
            if(i >= parts.length-1) {
                if(mode==='push') current[parts[i]].push(value);
                else current[parts[i]] = value;
            }
            else current[parts[i]] = current[parts[i]]===undefined || current[parts[i]]===null ? {} : current[parts[i]];    
            current = current[parts[i]];
            }
        }
        return parent;
    }
    
    function deepGet(parent, namespace) {
        if((!parent && parent!==false && parent!==0) || typeof parent === 'function') return undefined;
        if(namespace==='this') return parent;
        
        var parts = namespace.split('.');
        var current = parent;
        
        for(var i=0; i<parts.length; i++) {
            if(!current[parts[i]] && current[parts[i]]!==false && current[parts[i]]!==0) return undefined;
            else current = current[parts[i]];
        }
        
        // function as value is not allowed
        if(typeof current === 'function') return undefined;
        return current;
    }
    
    function deepRemove(obj, keyPath){
        obj = obj || {};
        keyPath = keyPath || '';
        var keys = keyPath.split('.');
        if(keys.length===0) return;
        if(keys.length===1) { delete obj[keys[0]]; return; }
        
        for(var i=0;i < keys.length-1;i++) {
            obj = obj[keys[i]];
            if(!obj) return;
        }
        delete obj[keys[keys.length-1]]; // delete last prop
    }
    
    function sortArray(keyName, dir, array){ // sortArray({ key1:1, key2:-1 }, dir)
        var keys;
        
        if(arguments.length===2){
            if(isObject(keyName)) {
                keys = keyName;
                array = arguments[1];
            }
            else {
                array = arguments[1];
                dir = 1;
            }
        }
        else {
            keys = {};
            keys[keyName] = dir;
        }
        
        for(var key in keys){
            if(keys[key]==='asc') keys[key] = 1;
            if(keys[key]==='desc') keys[key] = -1;
        }
        
        array.sort(function(a, b) {
            for(var key in keys){
                if( deepGet(a, key) > deepGet(b, key)) return keys[key];
                if( deepGet(a, key) < deepGet(b, key)) return -keys[key];
            }
            return 0;
        });
        
        return array;
    }
    
    function objectToArray(obj, sortNamespace, dir){
        var array = [];
        
        for(var key in obj) {
            if(key!=='$key' && key!=='$sortIndex' && obj.hasOwnProperty(key)){
                obj.$key = key;
                if(sortNamespace) obj.$sortIndex = deepGet(obj[key], sortNamespace);
                array.push(obj[key]);
            }
        }
        return sortNamespace ? sortArray('$sortIndex', dir || 'asc', array) : array;
    }
    
    function arrayToObject(array, idNamespace){
        if(!angular.isArray(array) || !idNamespace) return {};

        var obj = {}, key;
        for(var i=0;i<array.length;i++){
            key = deepGet(array[i], idNamespace);
            obj[key] = array[i];
        }

        return obj;
    }
    
    function isRegExp(value) {
        return Object.prototype.toString.call(value) === '[object RegExp]';
    }
    
    function isWindow(obj) {
        return obj && obj.window === obj;
    }


    function isScope(obj) {
        return obj && obj.$evalAsync && obj.$watch;
    }
    
    function defaultExcludeKeyFnc(key){
        if(key[0] === '$' && key[1] === '$') return true;
    }

    // modified angular equals to support single dollar key prefixes
    function deepEquals(o1, o2, excludeKeyFnc) {
        excludeKeyFnc = excludeKeyFnc || defaultExcludeKeyFnc;
        
        if (o1 === o2) return true;
        if (o1 === null || o2 === null) return false;
        if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN
        var t1 = typeof o1, t2 = typeof o2, length, key, keySet;
        if (t1 == t2 && t1 == 'object') {
            if (angular.isArray(o1)) {
                if (!angular.isArray(o2)) return false;
                if ((length = o1.length) == o2.length) {
                    for (key = 0; key < length; key++) {
                        if (!deepEquals(o1[key], o2[key], excludeKeyFnc)) return false;
                    }
                    return true;
                }
            } else if (angular.isDate(o1)) {
                if (!angular.isDate(o2)) return false;
                return deepEquals(o1.getTime(), o2.getTime(), excludeKeyFnc);
            } else if (isRegExp(o1)) {
                if (!isRegExp(o2)) return false;
                return o1.toString() == o2.toString();
            } else {
                if (isScope(o1) || isScope(o2) || isWindow(o1) || isWindow(o2) ||
                    angular.isArray(o2) || angular.isDate(o2) || isRegExp(o2)) return false;
                keySet = Object.create(null);
                for (key in o1) {
                    if (excludeKeyFnc(key) || angular.isFunction(o1[key])) continue;
                    if (!deepEquals(o1[key], o2[key], excludeKeyFnc)) return false;
                    keySet[key] = true;
                }
                for (key in o2) {
                    if (!(key in keySet) &&
                        !excludeKeyFnc(key) &&
                        angular.isDefined(o2[key]) &&
                        !angular.isFunction(o2[key])) return false;
                }
                return true;
            }
        }
        return false;
    }
    
    
    /**
     * Service function that helps to avoid multiple calls of a function (typically save()) during angular digest cycle.
     * $apply will be called after original function returns;
     *
     * @example:
     *  $scope.save = debounce(function(order){
     *     // POST your order here ...$http....
     *     // debounce() will make sure save() will be called only once
     *   });
     */
    function debounce(fn, timeout, apply){ // debounce fn
        timeout = angular.isUndefined(timeout) ? 0 : timeout;
        apply = angular.isUndefined(apply) ? true : apply; // !!default is true! most suitable to my experience
        var prevTimeout;
        return function(){ // intercepting fn
            if(prevTimeout) $timeout.cancel(prevTimeout);
            var that = this;
            var argz = arguments;
            
            prevTimeout = $timeout(function(){
                prevTimeout = null;
                fn.apply(that, argz);
            }, timeout, apply);
            
            return prevTimeout;
        };
    }
    
    // auto parse dates
    var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
    var regexIsoStrict = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;

    function dateStringsToDates(input, useStrictDateParser) {
        if(useStrictDateParser === undefined) useStrictDateParser = true; // only if forced to not use strict
        var value, match, milliseconds;

        // try to parse if input is string
        if(typeof input === 'string' && (match = input.match(useStrictDateParser ? regexIsoStrict : regexIso8601))) {
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
            if(typeof value === 'string' && (match = value.match(useStrictDateParser ? regexIsoStrict : regexIso8601))) {
                milliseconds = Date.parse(match[0]);
                if (!isNaN(milliseconds)) {
                    input[key] = new Date(milliseconds);
                }
            }
            else if (typeof value === 'object') {
                // Recurse into object
                dateStringsToDates(value, useStrictDateParser);
            }
        }        
        return input;
    }
    
    function fromJson(str, useStrictDateParser){
        var result;
        try {
            result = JSON.parse(str);
        }
        catch(err){}
        
        return dateStringsToDates(result, useStrictDateParser);
    }
    
    function removePrefixedProps(input, prefix) {

        // Ignore things that aren't objects.
        if(typeof input !== 'object' || !prefix) return input;

        for(var key in input) {
            if(input.hasOwnProperty(key)) {
                var value = input[key];

                if(key.indexOf(prefix)===0) delete input[key];
                else if(typeof value === 'object') removePrefixedProps(value, prefix);
            }
        }
    }
    
    function isObject(obj){
        return Object.prototype.toString.call(obj) === '[object Object]';
    }

    function isArray(obj){
        return Array.isArray(obj);
    }
    
    return {
        isObject: isObject,
        isArray: isArray,
        extendReservedInstances: [], // [File, FileList, Blob],
        extend: extend,
        merge: extend,
        setObjValue: deepSet,
        deepSet: deepSet,
        getObjValue: deepGet,
        deepGet: deepGet,
        deepReplace: deepReplace,
        deepRemove: deepRemove,
        deepEquals: deepEquals,
        deepEqual: deepEquals,
        objectToArray: objectToArray,
        arrayToObject: arrayToObject,
        dateStringsToDates: dateStringsToDates,
        fromJson: fromJson,
        fromJSON: fromJson,
        removePrefixedProps: removePrefixedProps,
        debounce: debounce
    };

}]);
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
                       '            <button ng-if="query.onlyPredefinedFields" class="btn btn-sm btn-default" uib-dropdown-toggle style="width:142px;height:30px">'+
                       '                <span class="nowrap" ng-if="query.fieldName">{{query.fieldName}}</span><span class="nowrap" ng-if="!query.fieldName">{{::\'choose field\'|translate}}</span>'+
                       '            </button>'+
                       '            <input ng-if="!query.onlyPredefinedFields" type="text" placeholder="{{::\'choose field\'|translate}}" class="input-sm" uib-dropdown-toggle ng-change="query.setFieldByName(query.fieldName);onChange()" ng-model="query.fieldName"/>'+
                       '            <ul ng-if="query.fields.filterByName(query.fieldName, query.field.name).length" class="dropdown-menu" style="max-height:220px;overflow:auto">'+
                       '                <li ng-repeat="field in query.fields.filterByName(query.fieldName, query.field.name)" ng-class="{\'active\':(field.name===query.fieldName)}">'+
                       '                    <a href="" ng-click="query.setField(field);onChange()">'+
                       '			             {{field.name}}'+
                       '			        </a>'+
                       '                </li>'+
                       '            </ul>'+
                       '        </div>'+
                       '        <div class="dropdown visible-inline-block" uib-dropdown keyboard-nav>'+
                       '            <button ng-disabled="query.field.disableOperator" class="btn btn-default btn-sm" uib-dropdown-toggle style="width:120px;height:30px">'+
                       '                <span class="class="nowrap"">{{query.operator | translate}}&nbsp;</span>'+
                       '            </button>'+
                       '            <ul class="dropdown-menu" style="min-width:210px;overflow:auto">'+
                       '                <li ng-if="!query.field.disableType" class="text-center">'+
                       '                    <div class="btn-group btngroup-xs">'+
                       '                        <button class="btn btn-default btn-xs" ng-class="{\'btn-success\':(query.type.name===type)}" style="padding:2px;" uib-tooltip="{{\'qtype_\'+type | translate}}" ng-repeat="type in query.types" ng-click="query.setType(type);$event.stopPropagation();">'+
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
                       '        <div class="btn-group btn-group-xs">'+
                       '            <button class="btn btn-default" ng-click="query.next(\'AND\');onChange()">{{::\'AND\' | translate}}</button>'+
                       '            <button class="btn btn-default" ng-click="query.next(\'OR\');onChange()">{{::\'OR\' | translate}}</button>'+
                       '            <button class="btn btn-default" ng-click="query.levelDown();onChange()"><i class="fa fa-fw fa-level-down"></i></button>'+
                       '            <button class="btn btn-default" ng-click="close();query.remove();onChange()"><i class="fa fa-fw fa-minus"></i></button>'+
                       '        </div>'+
                       '    </div>'+
                       '    <div ng-if="query.length" class="visible-inline-block" style="position:relative;">'+
                       '        <small>{{ ($first ? \' \' : query.logical) | translate}}<br></small>'+
                       '        <div class="btn-group btn-group-xs" style="position:absolute;right:0px;top:1px">'+
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
                       '       ng-model="query.value"'+
                       '       ng-change="onChange()"/>');

    $templateCache.put('neQuery/datetime.html',
                       '<input type="text" '+
                       '       class="input-sm" '+
                       '       placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}"'+
                       '       uib-datetimepicker-popup '+
                       '       show-seconds="true" '+
                       '       is-open="query.value_opened" '+
                       '       ng-click="query.value_opened=!query.value_opened" '+
                       '       ng-model="query.value"' +
                       '       ng-change="onChange()"/>');

    $templateCache.put('neQuery/number.html',
                       '<input type="number" '+
                       '       class="input-sm" '+
                       '       placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}" '+
                       '       ng-model="query.value" '+
                       '       ng-change="onChange()" '+
                       '       style="width:142px;"/>');

    $templateCache.put('neQuery/list.html',
                       '<select class="input-sm" '+
                       '        ng-model="query.value" '+
                       '        ng-options="(value | translate) for value in query.field.values" '+
                       '        ng-change="onChange()" '+
                       '        style="width:142px;">'+
                       '</select>');

    $templateCache.put('neQuery/boolean.html',
                       '<select class="input-sm" '+
                       '        ng-model="query.value" '+
                       '        ng-options="(\'qvalue_\'+value | translate) for value in [true,false]" '+
                       '        ng-change="onChange()" '+
                       '        style="width:142px;">'+
                       '</select>');

    $templateCache.put('neQuery/string.html',
                       '<input type="text" '+
                       '       class="input-sm" '+
                       '       placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}" '+
                       '       ng-model="query.value" '+
                       '       ng-change="onChange()"/>');

    $templateCache.put('neQuery/string-suggestions.html',
                       '<div class="dropdown visible-inline-block" uib-dropdown keyboard-nav>'+
                       '    <input type="text" '+
                       '           class="input-sm" '+
                       '           placeholder="{{(query.field.isEmptyValue(query.value) ? (query.field.placeholder||\'type value\') : \'empty value\')|translate}}" '+
                       '           uib-dropdown-toggle '+
                       '           ng-model="query.suggestion" '+
                       '           ng-change="query.field.onlySuggestedValues ? query.value=null : query.value=query.suggestion;query.field.createSuggestions(query, query.suggestion);onChange()">'+
                       '    <ul ng-if="query.suggestions.length" class="dropdown-menu" style="max-height:220px;overflow:auto">'+
                       '        <li ng-repeat="value in query.suggestions" ng-class="{\'active\':(value===query.value)}">'+
                       '          <a href="" ng-click="query.value=value.key;query.suggestion=value.name;onChange()">'+
                       '		      {{value.name}}'+
                       '		  </a>'+
                       '        </li>'+
                       '    </ul>'+
                       '</div>');

    $templateCache.put('neQuery/disabled.html',
                       '<input type="text" disabled="disabled" class="input-sm" ng-model="query.value"/>');

    $templateCache.put('neQuery/sort.html',
                       '<div class="visible-inline-block">'+
                       '<div ng-repeat-start="sort in query.sortBy track by $index" style="display:inline-block;position:relative;margin:2px" ng-style="{\'margin-top\':$first ? \'0px\' : \'2px\'}">'+
                       '    <small>{{::\'Order By\'|translate}}</small>'+
                       '    <div class="visible-inline-block">'+
                       '        <div class="dropdown visible-inline-block" uib-dropdown keyboard-nav>'+
                       '            <button ng-if="query.onlyPredefinedFields" class="btn btn-sm btn-default" uib-dropdown-toggle style="width:142px;height:30px">'+
                       '                <span class="nowrap" ng-if="sort.fieldName">{{sort.fieldName}}</span><span class="nowrap" ng-if="!sort.fieldName">{{::\'choose field\'|translate}}</span>'+
                       '            </button>'+
                       '            <input ng-if="!query.onlyPredefinedFields" type="text" placeholder="{{::\'choose field\'|translate}}" class="input-sm" uib-dropdown-toggle ng-change="query.setSortByName(sort.fieldName, $index);onChange()" ng-model="sort.fieldName" />'+
                       '            <ul ng-if="query.fields.filterByName(sort.fieldName, sort.name).length" class="dropdown-menu" style="max-height:220px;overflow:auto">'+
                       '                <li ng-repeat="field in query.fields.filterByName(sort.fieldName, sort.name)" ng-class="{\'active\':(field.name===sort.fieldName)}">'+
                       '                    <a href="" ng-click="query.setSortField(field,$parent.$index);onChange()">'+
                       '        			    {{field.name}}'+
                       '        			</a>'+
                       '                </li>'+
                       '            </ul>'+
                       '        </div>'+
                       '        <div class="btn-group btn-group-xs">'+
                       '            <button class="btn btn-default" ng-click="query.toggleSortDirection($index);onChange()">'+
                       '                <i class="fa fa-fw" ng-class="{\'fa-sort-amount-asc\':sort.direction===1,\'fa-sort-amount-desc\':sort.direction===-1}"></i>'+
                       '            </button>'+
                       '            <button class="btn btn-default" ng-click="query.addSort($index);onChange()"><i class="fa fa-fw fa-plus"></i></button>'+
                       '            <button class="btn btn-default" ng-click="query.removeSort($index);onChange()"><i class="fa fa-fw fa-minus"></i></button>'+
                       '        </div>'+
                       '    </div>'+
                       '</div>'+
                       '<br ng-repeat-end>'+
                       '<button ng-if="!query.sortBy.length" class="btn btn-default btn-sm" ng-click="query.addSort();onChange()"><i class="fa fa-fw fa-signal"></i> <span class="hidden-sm">{{::\'Order By\'|translate}}</span></button>'+
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
        template: '<div class="pull-left" ne-query="query" ne-query-change="onChange()"></div>'+
                  '<div class="pull-left hidden-xs" style="width:20px">&nbsp;</div>'+
                  '<div class="pull-left" ne-query-sort="query" ne-query-sort-change="onChange()"></div>'+
                  '<button class="btn btn-primary btn-sm" ng-click="searchClick()" style="margin-left:2px">'+
                  '    <i class="fa fa-fw fa-search"></i>'+
                  '    <span class="hidden-sm">{{::\'Search\' | translate}}</span>'+
                  '</button>',
        scope:{ query:'=neQuerySearch', searchClick:'&neQuerySearchClick', onQuerySearchChange:'&neQuerySearchChange', querySearchEmpty:'=neQuerySearchEmpty' },
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
        scope:{ query:'=neQuery', onQueryChange:'&neQueryChange', queryEmpty:'=neQueryEmpty' },
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
        scope:{ query:'=neQuerySort', onQuerySortChange:'&neQuerySortChange', querySortEmpty:'=neQuerySortEmpty' },
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
.factory('NeQuery',['neLocal','neObject', function(local, object){

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
            child.setValueByNameAndField();
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
            build: function(value){ return { $regex: value }; },
            parse: function(key, value){
                var operator, op, match;

                for(var i=0;i<types.string.operators.length;i++){
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
        q.setValueByNameAndField = setValueByNameAndField;
        q.setField = setField;
        q.setOperator = setOperator;
        q.setType = setType;
        q.addSort = addSort;
        q.removeSort = removeSort;
        q.toggleSortDirection = toggleSortDirection;
        q.setSortByName = setSortByName;
        q.setSortField = setSortField;

        var parent;
        q.parent = q.getParent = function(){ return parent; };
        q.setParent = function(newParent){ parent = newParent; };

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

    function setValueByNameAndField() {
        if(this.field.suggestions) {
            var self = this;
            this.field.suggestions("", function(values) {
              var found = values.filter(function(value) {return value.key === self.value});
              if(found.length) {
                  self.suggestion = found[0].name;
              }
            });
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
                    var minLength = field.suggestionMinLength || field.suggestionMinSearchLength || 3;
                    return object.debounce(function(query, searchText){
                        searchText = searchText || '';
                        if(searchText.length >= minLength) field.loadSuggestions(searchText, function(values){
                            query.suggestions = values.map(function(value) {
                              return {
                                key: value.key || value,
                                name: value.name || value.key || value};
                            });;
                        });
                    }, field.suggestionDebounce >= 0 ? field.suggestionDebounce : 350);
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
.factory('NeResourceTransformators.dateStringsToDates', ['neObject', function(object){    
    return object.dateStringsToDates;
}])
.factory('NeResourceTransformators.removePrefixedProps', ['neObject', function(object){
    return object.removePrefixedProps;
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
            if(typeof value === 'string') value = encodeURIComponent(value).replace(/\//g, '%2F').replace(/\?/g, '%3F').replace(/#/g,'%23'); // escape "/","?","#"
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
        var ignoreLoading = httpOpts.ignoreLoading;
        var fd = new FormData();
        
        for(var key in data) {
            if(data[key] instanceof Blob || data[key] instanceof File) {
                fd.append(key, data[key], data[key].name);
            }
            else fd.append(key, data[key]);
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
            if(!ignoreLoading) loading.reqEnded();
            
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
            if(!ignoreLoading) loading.reqStarted(); // show loading notification
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
            ignoreLoading = cmdOpts.ignoreLoading!==undefined ? cmdOpts.ignoreLoading : opts.ignoreLoading,
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
        
        // replace default pagination props by custom if defined in query
        query = replacePaginationProps(query, pageKey, limitKey, sortKey, object);
        if(data) data = replacePaginationProps(data, pageKey, limitKey, sortKey, object);
        
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
            headers: headers,
            ignoreLoading: ignoreLoading
        };
        
        if(method === 'post-multipart' || method === 'upload') upload.call(resource, cmdName, query, httpOpts, successCbs, errorCbs, progressCbs);
        else $http(httpOpts).then(handleSuccess(query, opts, cmdName, successCbs), handleError(query, opts, cmdName, errorCbs));
    };
                                
    function replacePaginationProps(queryOrData, pageKey, limitKey, sortKey, object) {
        if(pageKey !== '$page'){
            queryOrData = object.deepSet(queryOrData, pageKey, queryOrData.$page);
            delete queryOrData.$page;
        }
        if(limitKey !== '$limit'){
            queryOrData = object.deepSet(queryOrData, limitKey, queryOrData.$limit);
            delete queryOrData.$limit;
        }
        if(sortKey !== '$sort'){
            queryOrData = object.deepSet(queryOrData, sortKey, queryOrData.$sort);
            delete queryOrData.$sort;
        }
        return queryOrData;
    }
    
    
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
    
}]);
/**
 *                                                  NE STATE
 * ***************************************************************************************************************************
 */

angular.module('neState', ['ngCookies'])
.factory('NeStateService',['$timeout','$location','$rootScope','$cookies','neObject', function($timeout, $location, $rootScope, $cookies, object){

	
    function encryptString(str){
        return window.btoa(str);
    }
    
    function decryptString(str){
        return window.atob(str);
    }
    
    var locationStore = {
        encrypt: false,
        prefix: 'q',
        parser: function (locationString){
            var locationPrefix = this.prefix;
            var encryptLocation = this.encrypt;
            locationString = locationString || $location.search()[ locationPrefix ]; // decodeURIComponent not necessary, locationString is already decoded

            try {
                if(encryptLocation) locationString = decryptString(locationString);
                return object.fromJson(locationString || '{}') || {};
            }
            catch(err){}
            return {};
        },
        builder: function(stateObj){
            var locationPrefix = this.prefix;
            var encryptLocation = this.encrypt;
            var str = JSON.stringify(stateObj, removeEmptyStates); //.replace(/=/,'%3D').replace(/\&/, '%26').replace(/\?/, '%3F');
            
            // there don't have to be empty states in url
            function removeEmptyStates(key, value){
                if(!stateObj[key]) return value;
                if(Object.keys(stateObj[key]).length) return value;
            }
            
            if(encryptLocation) str = encryptString(str);
            return str;
        },
        autoUpdate: false, // auto updates on change
        autoFill: false, // watch and fire state change
        sync: false, // auto update and also watch
        _unbinders:{}, // unbind route change listeners
        
        init: function(state, stateId){
            var locationStore = this;
            if(!(locationStore.autoFill || locationStore.sync)) return;
            
            if(stateId) locationStore._unbinders[ stateId ] = {
                routeUpdate: $rootScope.$on('$routeUpdate', function (){
                    locationStore.fill(state, stateId);
                }),
                routeChangeSuccess: $rootScope.$on('$routeChangeSuccess', function (){
                    locationStore.fill(state, stateId);
                })
            };
            
            locationStore.fill(state, stateId);
        },
        destroy: function(state, stateId){
            return this.unbind(state, stateId);
        },
        unbind: function(state, stateId){
            var locationStore = this;
            var unbindStateIds = stateId ? [stateId] : Object.keys(locationStore._unbinders);
            
            for(var i=0;i<unbindStateIds.length;i++){
                var id = unbindStateIds[i];
                if(locationStore._unbinders[id]){
                    locationStore._unbinders[id].routeUpdate();
                    locationStore._unbinders[id].routeChangeSuccess();
                }
            }
        },
        fill: function(state, stateId){
            var locationStore = this;
            var locationString = $location.search()[ locationStore.prefix ];
            var stateObj = locationStore.parser(locationString) || {};

            $timeout(function(){
                if(stateId) state.change(stateId, stateObj[stateId] || {}, true);
                else for(var id in state.history) state.change(id, stateObj[id] || {}, true);
            });
        },
        update: function(state, stateId){
            var locationStore = this;
            if(!(locationStore.autoUpdate || locationStore.sync)) return;
            
            var locationSearch = locationStore.builder(state.getCurrentState());
            $location.search(locationStore.prefix, locationSearch);
        }
    };
    
    // TODO: implement
    var cookiesStore = {
        //encrypt: false,
        prefix: 'appState',
        //domain:'',
        //expires:'',
        path:'/',
        secure:false,
        autoUpdate: false, // auto updates on change
        autoFill: false, // watch and fire state change
        sync: false, // auto update and also watch
        
        init: function(state, stateId){},
        destroy: function(state, stateId){},
        unbind: function(state, stateId){},
        fill: function(state, stateId){
            var locationStore = this;
            var stateObj = $cookies.getObject(locationStore.prefix) || {};

            $timeout(function(){
                if(stateId) state.change(stateId, stateObj[stateId] || {}, true);
                else for(var id in state.history) state.change(id, stateObj[id] || {}, true);
            });
        },
        update: function(state, stateId){
            var locationStore = this;
            if(!(locationStore.autoUpdate || locationStore.sync)) return;

            $cookies.putObject(locationStore.prefix, state.getCurrentState(), {
                domain: locationStore.domain,
                expires: locationStore.expires,
                path: locationStore.path,
                secure: locationStore.secure,
            });
        }
    };

	var defaultOpts = {
		maxHistoryStates: 5,
        store: locationStore
	};

	function StateService(opts){
        opts = opts || {};
        
        angular.merge(this, {}, defaultOpts, opts);
		this.history = {};
        this.changeListeners = [];
        
		return this;
	}
    
    StateService.locationStore = locationStore;
    StateService.cookiesStore = cookiesStore;

	StateService.prototype.create = 
	StateService.prototype.register = function(id, opts){
        opts = opts || {};
        var state = this;
		if(state.history[id]) return state.history[id];
        
        var stateHistory = [];
		stateHistory.maxHistoryStates = opts.maxHistoryStates || state.maxHistoryStates;
        
        if(opts.store === 'location') opts.store = locationStore;
        if(opts.store === 'cookies') opts.store = cookiesStore;
        
        stateHistory.store = angular.merge({}, state.store, opts.store || {});
        stateHistory.changeListeners = [];
        stateHistory.currentStateIndex = -1;
        state.history[id] = stateHistory;
        
        state.history[id].store.init(state, id);
		return state.history[id];
	};
    
    StateService.prototype.changeState = 
	StateService.prototype.change = function(id, value, disableStoreUpdate) {
		if(!angular.isObject(value)) throw new Error('StateService: cannot change state, value have to be object and is "' +value+ '"');
		var state = this;
        state.history[id] = state.history[id] || state.register(id);
        
		var currIndex = state.history[id].currentStateIndex;
		var howManyRemove = state.history[id].length ? state.history[id].length - 1 - currIndex : 0;

        if(state.history[id].length > 0 && object.deepEquals(state.history[id][currIndex], value)) return state; // same state as previous, no change
        
		state.history[id].splice(currIndex + 1, howManyRemove);
		state.history[id].push( angular.merge({}, value) );
		if(state.history[id].length > state.history[id].maxHistoryStates) state.history[id].splice(0,1);
		else state.history[id].currentStateIndex++;
        
        if(!disableStoreUpdate){
            state.history[id].store.update(state, id);
        }
        
        var changedFromStore = disableStoreUpdate;
        return state.fireChange(id, null, changedFromStore);
	};
    
    StateService.prototype.updateState = 
    StateService.prototype.update = function(id, value){
        if(!angular.isObject(value)) throw new Error('StateService: cannot change state, value have to be object and is "' +value+ '"');
		var state = this;
        state.history[id] = state.history[id] || state.register(id);
        if(!state.history[id].length) return state; // nothing to update, there is no state yet
        
		var currIndex = state.history[id].currentStateIndex;
		state.history[id][ currIndex ] = angular.merge({}, value);
        return state;
    };

	StateService.prototype.fireChange = function(id, oldValue, changedFromStore) {
		if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
		
        var historyIndex = this.history[id].currentStateIndex;
		var specChangeListeners = this.history[id].changeListeners;
		oldValue = oldValue || this.getPrevState(id) || {};
		var newValue = this.getCurrentState(id) || {};

		for(var i=0;i<specChangeListeners.length;i++) specChangeListeners[i]( newValue, oldValue, changedFromStore, historyIndex ); 
		for(var i=0;i<this.changeListeners.length;i++) this.changeListeners[i]( id, newValue, oldValue, changedFromStore, historyIndex ); 
		return this;
	};

	StateService.prototype.watch = 
	StateService.prototype.onChange = function(id, fnc) {
		var state = this;
        if(arguments.length === 1) {
			fnc = arguments[0];
			id = null;
		}

		if(id) {
            state.history[id] = state.history[id] || state.register(id);
			state.history[id].changeListeners.push(fnc);
		}
		else state.changeListeners.push(fnc);
		return state;
	};

	StateService.prototype.unWatch = 
	StateService.prototype.unbindChange = 
	StateService.prototype.offChange = function(id, fnc) {
		if(arguments.length === 1) {
			fnc = arguments[0];
			id = null;
		}

		var index;

		if(id) {
			if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
			index = this.history[id].changeListeners.indexOf(fnc);
			if(index >= 0) this.history[id].changeListeners.splice(index, 1);
		}
		else {
			index = this.changeListeners.indexOf(fnc);
			if(index >= 0) this.changeListeners.splice(index, 1);
		}
		return this;
	};
    
    StateService.prototype.clear = function(id) {
        if(id) {
            this.history[id].splice(0, this.history[id].length);
            this.history[id].changeListeners = [];
            this.history[id].currentStateIndex = -1;
        }
        else {
            this.history = {};
            this.changeListeners = [];
        }
        return this;
    };
    
    StateService.prototype.destroy = function(id) {
        if(id) {
            this.history[id].store.unbind(this, id);
            this.store.unbind(this, id);
            this.clear(id);
            delete this.history[id];
        }
        else {
            this.history = {};
            this.changeListeners = [];
            this.store.unbind(this, id);
            for(var h in this.history) this.history[h].store.unbind(this, h);
        }
        return this;
    };

	StateService.prototype.getCurrentState = function(id) {
		if(arguments.length === 0){
			var states = {};
			for(var id in this.history) states[id] = this.history[id][ this.history[id].currentStateIndex ];
			return states;
		}

		if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
		return this.history[id][ this.history[id].currentStateIndex ];
	};

	StateService.prototype.getPrevState = function(id) {
		if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
		var prevIndex = this.history[id].currentStateIndex - 1;
		if(prevIndex < 0) return {};
		return this.history[id][ prevIndex ];
	};

	StateService.prototype.getNextState = function(id) {
		if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
		var nextIndex = this.history[id].currentStateIndex + 1;
		if(nextIndex >= this.history[id].length) nextIndex = this.history[id].length ? this.history[id].length - 1 : 0;
		return this.history[id][ nextIndex ];
	};

    StateService.prototype.getFutureState = function(id, value){
        var futureState = {};
		if(arguments.length === 2){
			futureState[id] = value;
			futureState = angular.merge({}, this.getCurrentState(), futureState);
		}
		else futureState = this.getCurrentState();
		return futureState;
    };
    
    function moveState(indexIncrement){
        return function(id) {
            if(!this.history[id]) throw new Error('StateService: there is no registered state with id "' +id+ '"');
            var oldValue = this.getCurrentState(id);
            var currStateIndex = this.history[id].currentStateIndex + indexIncrement;
            if(currStateIndex < 0) currStateIndex = 0;
            if(currStateIndex >= this.history[id].length) currStateIndex = this.history[id].length ? this.history[id].length - 1 : 0;
            this.history[id].currentStateIndex = currStateIndex;
            return oldValue === this.getCurrentState(id) ? this : this.fireChange(id, oldValue);
        };
    }

    StateService.prototype.undo = moveState(-1);
    StateService.prototype.redo = moveState(1);

	StateService.prototype.undoAll = function() {
        for(var id in stateObj) this.undo(id);
	};

	StateService.prototype.redoAll = function() {
        for(var id in stateObj) this.redo(id);
	};

	return StateService;
}]);
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
    
    function load(parent, loadMode, cb){
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
                tree.getResourceMethod('find', parent)(query, function(items, pagination){
                    tree.fillItems(parent, items, pagination, loadMode);
                    if(cb) cb(items);
                    tree.disabled = false;
                });

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
    
    function createItem(parent, item, appendChild, cb){
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
        });
        return tree;
    }
    
    
    function updateItem(item, cb){
        this.getResourceMethod('update', item)(item, function(data){
            item = object.extend('data', item, data);
            if(cb) cb(item);
        });
        return this;
    }
    
    function refreshItem(item, cb){
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
        });
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
    
    function removeItem(item, cb){
        var tree = this;
        
        tree.getResourceMethod('remove',item)(item, function(){
            tree.maintainReferences( tree.getParentOf(item), item, true );
            
            var parent = tree.getParentOf(item);
            if(parent) parent.$children.splice(parent.$children.indexOf(item) ,1);
            else tree.items.splice(tree.items.indexOf(item), 1);
            
            if(typeof cb ==='function') cb();
        });
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
}]);/**
 * oclazyload - Load modules on demand (lazy load) with angularJS
 * @version v1.0.9
 * @link https://github.com/ocombe/ocLazyLoad
 * @license MIT
 * @author Olivier Combe <olivier.combe@gmail.com>
 */
(function (angular, window) {
    'use strict';

    var regModules = ['ng', 'oc.lazyLoad'],
        regInvokes = {},
        regConfigs = [],
        modulesToLoad = [],
        // modules to load from angular.module or other sources
    realModules = [],
        // real modules called from angular.module
    recordDeclarations = [],
        broadcast = angular.noop,
        runBlocks = {},
        justLoaded = [];

    var ocLazyLoad = angular.module('oc.lazyLoad', ['ng']);

    ocLazyLoad.provider('$ocLazyLoad', ["$controllerProvider", "$provide", "$compileProvider", "$filterProvider", "$injector", "$animateProvider", function ($controllerProvider, $provide, $compileProvider, $filterProvider, $injector, $animateProvider) {
        var modules = {},
            providers = {
            $controllerProvider: $controllerProvider,
            $compileProvider: $compileProvider,
            $filterProvider: $filterProvider,
            $provide: $provide, // other things (constant, decorator, provider, factory, service)
            $injector: $injector,
            $animateProvider: $animateProvider
        },
            debug = false,
            events = false,
            moduleCache = [],
            modulePromises = {};

        moduleCache.push = function (value) {
            if (this.indexOf(value) === -1) {
                Array.prototype.push.apply(this, arguments);
            }
        };

        this.config = function (config) {
            // If we want to define modules configs
            if (angular.isDefined(config.modules)) {
                if (angular.isArray(config.modules)) {
                    angular.forEach(config.modules, function (moduleConfig) {
                        modules[moduleConfig.name] = moduleConfig;
                    });
                } else {
                    modules[config.modules.name] = config.modules;
                }
            }

            if (angular.isDefined(config.debug)) {
                debug = config.debug;
            }

            if (angular.isDefined(config.events)) {
                events = config.events;
            }
        };

        /**
         * Get the list of existing registered modules
         * @param element
         */
        this._init = function _init(element) {
            // this is probably useless now because we override angular.bootstrap
            if (modulesToLoad.length === 0) {
                var elements = [element],
                    names = ['ng:app', 'ng-app', 'x-ng-app', 'data-ng-app'],
                    NG_APP_CLASS_REGEXP = /\sng[:\-]app(:\s*([\w\d_]+);?)?\s/,
                    append = function append(elm) {
                    return elm && elements.push(elm);
                };

                angular.forEach(names, function (name) {
                    names[name] = true;
                    append(document.getElementById(name));
                    name = name.replace(':', '\\:');
                    if (typeof element[0] !== 'undefined' && element[0].querySelectorAll) {
                        angular.forEach(element[0].querySelectorAll('.' + name), append);
                        angular.forEach(element[0].querySelectorAll('.' + name + '\\:'), append);
                        angular.forEach(element[0].querySelectorAll('[' + name + ']'), append);
                    }
                });

                angular.forEach(elements, function (elm) {
                    if (modulesToLoad.length === 0) {
                        var className = ' ' + element.className + ' ';
                        var match = NG_APP_CLASS_REGEXP.exec(className);
                        if (match) {
                            modulesToLoad.push((match[2] || '').replace(/\s+/g, ','));
                        } else {
                            angular.forEach(elm.attributes, function (attr) {
                                if (modulesToLoad.length === 0 && names[attr.name]) {
                                    modulesToLoad.push(attr.value);
                                }
                            });
                        }
                    }
                });
            }

            if (modulesToLoad.length === 0 && !((window.jasmine || window.mocha) && angular.isDefined(angular.mock))) {
                console.error('No module found during bootstrap, unable to init ocLazyLoad. You should always use the ng-app directive or angular.boostrap when you use ocLazyLoad.');
            }

            var addReg = function addReg(moduleName) {
                if (regModules.indexOf(moduleName) === -1) {
                    // register existing modules
                    regModules.push(moduleName);
                    var mainModule = angular.module(moduleName);

                    // register existing components (directives, services, ...)
                    _invokeQueue(null, mainModule._invokeQueue, moduleName);
                    _invokeQueue(null, mainModule._configBlocks, moduleName); // angular 1.3+

                    angular.forEach(mainModule.requires, addReg);
                }
            };

            angular.forEach(modulesToLoad, function (moduleName) {
                addReg(moduleName);
            });

            modulesToLoad = []; // reset for next bootstrap
            recordDeclarations.pop(); // wait for the next lazy load
        };

        /**
         * Like JSON.stringify but that doesn't throw on circular references
         * @param obj
         */
        var stringify = function stringify(obj) {
            try {
                return JSON.stringify(obj);
            } catch (e) {
                var cache = [];
                return JSON.stringify(obj, function (key, value) {
                    if (angular.isObject(value) && value !== null) {
                        if (cache.indexOf(value) !== -1) {
                            // Circular reference found, discard key
                            return;
                        }
                        // Store value in our collection
                        cache.push(value);
                    }
                    return value;
                });
            }
        };

        var hashCode = function hashCode(str) {
            var hash = 0,
                i,
                chr,
                len;
            if (str.length == 0) {
                return hash;
            }
            for (i = 0, len = str.length; i < len; i++) {
                chr = str.charCodeAt(i);
                hash = (hash << 5) - hash + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        };

        function _register(providers, registerModules, params) {
            if (registerModules) {
                var k,
                    moduleName,
                    moduleFn,
                    tempRunBlocks = [];
                for (k = registerModules.length - 1; k >= 0; k--) {
                    moduleName = registerModules[k];
                    if (!angular.isString(moduleName)) {
                        moduleName = getModuleName(moduleName);
                    }
                    if (!moduleName || justLoaded.indexOf(moduleName) !== -1 || modules[moduleName] && realModules.indexOf(moduleName) === -1) {
                        continue;
                    }
                    // new if not registered
                    var newModule = regModules.indexOf(moduleName) === -1;
                    moduleFn = ngModuleFct(moduleName);
                    if (newModule) {
                        regModules.push(moduleName);
                        _register(providers, moduleFn.requires, params);
                    }
                    if (moduleFn._runBlocks.length > 0) {
                        // new run blocks detected! Replace the old ones (if existing)
                        runBlocks[moduleName] = [];
                        while (moduleFn._runBlocks.length > 0) {
                            runBlocks[moduleName].push(moduleFn._runBlocks.shift());
                        }
                    }
                    if (angular.isDefined(runBlocks[moduleName]) && (newModule || params.rerun)) {
                        tempRunBlocks = tempRunBlocks.concat(runBlocks[moduleName]);
                    }
                    _invokeQueue(providers, moduleFn._invokeQueue, moduleName, params.reconfig);
                    _invokeQueue(providers, moduleFn._configBlocks, moduleName, params.reconfig); // angular 1.3+
                    broadcast(newModule ? 'ocLazyLoad.moduleLoaded' : 'ocLazyLoad.moduleReloaded', moduleName);
                    registerModules.pop();
                    justLoaded.push(moduleName);
                }
                // execute the run blocks at the end
                var instanceInjector = providers.getInstanceInjector();
                angular.forEach(tempRunBlocks, function (fn) {
                    instanceInjector.invoke(fn);
                });
            }
        }

        function _registerInvokeList(args, moduleName) {
            var invokeList = args[2][0],
                type = args[1],
                newInvoke = false;
            if (angular.isUndefined(regInvokes[moduleName])) {
                regInvokes[moduleName] = {};
            }
            if (angular.isUndefined(regInvokes[moduleName][type])) {
                regInvokes[moduleName][type] = {};
            }
            var onInvoke = function onInvoke(invokeName, invoke) {
                if (!regInvokes[moduleName][type].hasOwnProperty(invokeName)) {
                    regInvokes[moduleName][type][invokeName] = [];
                }
                if (checkHashes(invoke, regInvokes[moduleName][type][invokeName])) {
                    newInvoke = true;
                    regInvokes[moduleName][type][invokeName].push(invoke);
                    broadcast('ocLazyLoad.componentLoaded', [moduleName, type, invokeName]);
                }
            };

            function checkHashes(potentialNew, invokes) {
                var isNew = true,
                    newHash;
                if (invokes.length) {
                    newHash = signature(potentialNew);
                    angular.forEach(invokes, function (invoke) {
                        isNew = isNew && signature(invoke) !== newHash;
                    });
                }
                return isNew;
            }

            function signature(data) {
                if (angular.isArray(data)) {
                    // arrays are objects, we need to test for it first
                    return hashCode(data.toString());
                } else if (angular.isObject(data)) {
                    // constants & values for example
                    return hashCode(stringify(data));
                } else {
                    if (angular.isDefined(data) && data !== null) {
                        return hashCode(data.toString());
                    } else {
                        // null & undefined constants
                        return data;
                    }
                }
            }

            if (angular.isString(invokeList)) {
                onInvoke(invokeList, args[2][1]);
            } else if (angular.isObject(invokeList)) {
                angular.forEach(invokeList, function (invoke, key) {
                    if (angular.isString(invoke)) {
                        // decorators for example
                        onInvoke(invoke, invokeList[1]);
                    } else {
                        // components registered as object lists {"componentName": function() {}}
                        onInvoke(key, invoke);
                    }
                });
            } else {
                return false;
            }
            return newInvoke;
        }

        function _invokeQueue(providers, queue, moduleName, reconfig) {
            if (!queue) {
                return;
            }

            var i, len, args, provider;
            for (i = 0, len = queue.length; i < len; i++) {
                args = queue[i];
                if (angular.isArray(args)) {
                    if (providers !== null) {
                        if (providers.hasOwnProperty(args[0])) {
                            provider = providers[args[0]];
                        } else {
                            throw new Error('unsupported provider ' + args[0]);
                        }
                    }
                    var isNew = _registerInvokeList(args, moduleName);
                    if (args[1] !== 'invoke') {
                        if (isNew && angular.isDefined(provider)) {
                            provider[args[1]].apply(provider, args[2]);
                        }
                    } else {
                        // config block
                        var callInvoke = function callInvoke(fct) {
                            var invoked = regConfigs.indexOf(moduleName + '-' + fct);
                            if (invoked === -1 || reconfig) {
                                if (invoked === -1) {
                                    regConfigs.push(moduleName + '-' + fct);
                                }
                                if (angular.isDefined(provider)) {
                                    provider[args[1]].apply(provider, args[2]);
                                }
                            }
                        };
                        if (angular.isFunction(args[2][0])) {
                            callInvoke(args[2][0]);
                        } else if (angular.isArray(args[2][0])) {
                            for (var j = 0, jlen = args[2][0].length; j < jlen; j++) {
                                if (angular.isFunction(args[2][0][j])) {
                                    callInvoke(args[2][0][j]);
                                }
                            }
                        }
                    }
                }
            }
        }

        function getModuleName(module) {
            var moduleName = null;
            if (angular.isString(module)) {
                moduleName = module;
            } else if (angular.isObject(module) && module.hasOwnProperty('name') && angular.isString(module.name)) {
                moduleName = module.name;
            }
            return moduleName;
        }

        function moduleExists(moduleName) {
            if (!angular.isString(moduleName)) {
                return false;
            }
            try {
                return ngModuleFct(moduleName);
            } catch (e) {
                if (/No module/.test(e) || e.message.indexOf('$injector:nomod') > -1) {
                    return false;
                }
            }
        }

        this.$get = ["$log", "$rootElement", "$rootScope", "$cacheFactory", "$q", function ($log, $rootElement, $rootScope, $cacheFactory, $q) {
            var instanceInjector,
                filesCache = $cacheFactory('ocLazyLoad');

            if (!debug) {
                $log = {};
                $log['error'] = angular.noop;
                $log['warn'] = angular.noop;
                $log['info'] = angular.noop;
            }

            // Make this lazy because when $get() is called the instance injector hasn't been assigned to the rootElement yet
            providers.getInstanceInjector = function () {
                return instanceInjector ? instanceInjector : instanceInjector = $rootElement.data('$injector') || angular.injector();
            };

            broadcast = function broadcast(eventName, params) {
                if (events) {
                    $rootScope.$broadcast(eventName, params);
                }
                if (debug) {
                    $log.info(eventName, params);
                }
            };

            function reject(e) {
                var deferred = $q.defer();
                $log.error(e.message);
                deferred.reject(e);
                return deferred.promise;
            }

            return {
                _broadcast: broadcast,

                _$log: $log,

                /**
                 * Returns the files cache used by the loaders to store the files currently loading
                 * @returns {*}
                 */
                _getFilesCache: function getFilesCache() {
                    return filesCache;
                },

                /**
                 * Let the service know that it should monitor angular.module because files are loading
                 * @param watch boolean
                 */
                toggleWatch: function toggleWatch(watch) {
                    if (watch) {
                        recordDeclarations.push(true);
                    } else {
                        recordDeclarations.pop();
                    }
                },

                /**
                 * Let you get a module config object
                 * @param moduleName String the name of the module
                 * @returns {*}
                 */
                getModuleConfig: function getModuleConfig(moduleName) {
                    if (!angular.isString(moduleName)) {
                        throw new Error('You need to give the name of the module to get');
                    }
                    if (!modules[moduleName]) {
                        return null;
                    }
                    return angular.copy(modules[moduleName]);
                },

                /**
                 * Let you define a module config object
                 * @param moduleConfig Object the module config object
                 * @returns {*}
                 */
                setModuleConfig: function setModuleConfig(moduleConfig) {
                    if (!angular.isObject(moduleConfig)) {
                        throw new Error('You need to give the module config object to set');
                    }
                    modules[moduleConfig.name] = moduleConfig;
                    return moduleConfig;
                },

                /**
                 * Returns the list of loaded modules
                 * @returns {string[]}
                 */
                getModules: function getModules() {
                    return regModules;
                },

                /**
                 * Let you check if a module has been loaded into Angular or not
                 * @param modulesNames String/Object a module name, or a list of module names
                 * @returns {boolean}
                 */
                isLoaded: function isLoaded(modulesNames) {
                    var moduleLoaded = function moduleLoaded(module) {
                        var isLoaded = regModules.indexOf(module) > -1;
                        if (!isLoaded) {
                            isLoaded = !!moduleExists(module);
                        }
                        return isLoaded;
                    };
                    if (angular.isString(modulesNames)) {
                        modulesNames = [modulesNames];
                    }
                    if (angular.isArray(modulesNames)) {
                        var i, len;
                        for (i = 0, len = modulesNames.length; i < len; i++) {
                            if (!moduleLoaded(modulesNames[i])) {
                                return false;
                            }
                        }
                        return true;
                    } else {
                        throw new Error('You need to define the module(s) name(s)');
                    }
                },

                /**
                 * Given a module, return its name
                 * @param module
                 * @returns {String}
                 */
                _getModuleName: getModuleName,

                /**
                 * Returns a module if it exists
                 * @param moduleName
                 * @returns {module}
                 */
                _getModule: function getModule(moduleName) {
                    try {
                        return ngModuleFct(moduleName);
                    } catch (e) {
                        // this error message really suxx
                        if (/No module/.test(e) || e.message.indexOf('$injector:nomod') > -1) {
                            e.message = 'The module "' + stringify(moduleName) + '" that you are trying to load does not exist. ' + e.message;
                        }
                        throw e;
                    }
                },

                /**
                 * Check if a module exists and returns it if it does
                 * @param moduleName
                 * @returns {boolean}
                 */
                moduleExists: moduleExists,

                /**
                 * Load the dependencies, and might try to load new files depending on the config
                 * @param moduleName (String or Array of Strings)
                 * @param localParams
                 * @returns {*}
                 * @private
                 */
                _loadDependencies: function _loadDependencies(moduleName, localParams) {
                    var loadedModule,
                        requires,
                        diff,
                        promisesList = [],
                        self = this;

                    moduleName = self._getModuleName(moduleName);

                    if (moduleName === null) {
                        return $q.when();
                    } else {
                        try {
                            loadedModule = self._getModule(moduleName);
                        } catch (e) {
                            return reject(e);
                        }
                        // get unloaded requires
                        requires = self.getRequires(loadedModule);
                    }

                    angular.forEach(requires, function (requireEntry) {
                        // If no configuration is provided, try and find one from a previous load.
                        // If there isn't one, bail and let the normal flow run
                        if (angular.isString(requireEntry)) {
                            var config = self.getModuleConfig(requireEntry);
                            if (config === null) {
                                moduleCache.push(requireEntry); // We don't know about this module, but something else might, so push it anyway.
                                return;
                            }
                            requireEntry = config;
                            // ignore the name because it's probably not a real module name
                            config.name = undefined;
                        }

                        // Check if this dependency has been loaded previously
                        if (self.moduleExists(requireEntry.name)) {
                            // compare against the already loaded module to see if the new definition adds any new files
                            diff = requireEntry.files.filter(function (n) {
                                return self.getModuleConfig(requireEntry.name).files.indexOf(n) < 0;
                            });

                            // If the module was redefined, advise via the console
                            if (diff.length !== 0) {
                                self._$log.warn('Module "', moduleName, '" attempted to redefine configuration for dependency. "', requireEntry.name, '"\n Additional Files Loaded:', diff);
                            }

                            // Push everything to the file loader, it will weed out the duplicates.
                            if (angular.isDefined(self.filesLoader)) {
                                // if a files loader is defined
                                promisesList.push(self.filesLoader(requireEntry, localParams).then(function () {
                                    return self._loadDependencies(requireEntry);
                                }));
                            } else {
                                return reject(new Error('Error: New dependencies need to be loaded from external files (' + requireEntry.files + '), but no loader has been defined.'));
                            }
                            return;
                        } else if (angular.isArray(requireEntry)) {
                            var files = [];
                            angular.forEach(requireEntry, function (entry) {
                                // let's check if the entry is a file name or a config name
                                var config = self.getModuleConfig(entry);
                                if (config === null) {
                                    files.push(entry);
                                } else if (config.files) {
                                    files = files.concat(config.files);
                                }
                            });
                            if (files.length > 0) {
                                requireEntry = {
                                    files: files
                                };
                            }
                        } else if (angular.isObject(requireEntry)) {
                            if (requireEntry.hasOwnProperty('name') && requireEntry['name']) {
                                // The dependency doesn't exist in the module cache and is a new configuration, so store and push it.
                                self.setModuleConfig(requireEntry);
                                moduleCache.push(requireEntry['name']);
                            }
                        }

                        // Check if the dependency has any files that need to be loaded. If there are, push a new promise to the promise list.
                        if (angular.isDefined(requireEntry.files) && requireEntry.files.length !== 0) {
                            if (angular.isDefined(self.filesLoader)) {
                                // if a files loader is defined
                                promisesList.push(self.filesLoader(requireEntry, localParams).then(function () {
                                    return self._loadDependencies(requireEntry);
                                }));
                            } else {
                                return reject(new Error('Error: the module "' + requireEntry.name + '" is defined in external files (' + requireEntry.files + '), but no loader has been defined.'));
                            }
                        }
                    });

                    // Create a wrapper promise to watch the promise list and resolve it once everything is done.
                    return $q.all(promisesList);
                },

                /**
                 * Inject new modules into Angular
                 * @param moduleName
                 * @param localParams
                 * @param real
                 */
                inject: function inject(moduleName) {
                    var localParams = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
                    var real = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

                    var self = this,
                        deferred = $q.defer();
                    if (angular.isDefined(moduleName) && moduleName !== null) {
                        if (angular.isArray(moduleName)) {
                            var promisesList = [];
                            angular.forEach(moduleName, function (module) {
                                promisesList.push(self.inject(module, localParams, real));
                            });
                            return $q.all(promisesList);
                        } else {
                            self._addToLoadList(self._getModuleName(moduleName), true, real);
                        }
                    }
                    if (modulesToLoad.length > 0) {
                        var res = modulesToLoad.slice(); // clean copy
                        var loadNext = function loadNext(moduleName) {
                            moduleCache.push(moduleName);
                            modulePromises[moduleName] = deferred.promise;
                            self._loadDependencies(moduleName, localParams).then(function success() {
                                try {
                                    justLoaded = [];
                                    _register(providers, moduleCache, localParams);
                                } catch (e) {
                                    self._$log.error(e.message);
                                    deferred.reject(e);
                                    return;
                                }

                                if (modulesToLoad.length > 0) {
                                    loadNext(modulesToLoad.shift()); // load the next in list
                                } else {
                                        deferred.resolve(res); // everything has been loaded, resolve
                                    }
                            }, function error(err) {
                                deferred.reject(err);
                            });
                        };

                        // load the first in list
                        loadNext(modulesToLoad.shift());
                    } else if (localParams && localParams.name && modulePromises[localParams.name]) {
                        return modulePromises[localParams.name];
                    } else {
                        deferred.resolve();
                    }
                    return deferred.promise;
                },

                /**
                 * Get the list of required modules/services/... for this module
                 * @param module
                 * @returns {Array}
                 */
                getRequires: function getRequires(module) {
                    var requires = [];
                    angular.forEach(module.requires, function (requireModule) {
                        if (regModules.indexOf(requireModule) === -1) {
                            requires.push(requireModule);
                        }
                    });
                    return requires;
                },

                /**
                 * Invoke the new modules & component by their providers
                 * @param providers
                 * @param queue
                 * @param moduleName
                 * @param reconfig
                 * @private
                 */
                _invokeQueue: _invokeQueue,

                /**
                 * Check if a module has been invoked and registers it if not
                 * @param args
                 * @param moduleName
                 * @returns {boolean} is new
                 */
                _registerInvokeList: _registerInvokeList,

                /**
                 * Register a new module and loads it, executing the run/config blocks if needed
                 * @param providers
                 * @param registerModules
                 * @param params
                 * @private
                 */
                _register: _register,

                /**
                 * Add a module name to the list of modules that will be loaded in the next inject
                 * @param name
                 * @param force
                 * @private
                 */
                _addToLoadList: _addToLoadList,

                /**
                 * Unregister modules (you shouldn't have to use this)
                 * @param modules
                 */
                _unregister: function _unregister(modules) {
                    if (angular.isDefined(modules)) {
                        if (angular.isArray(modules)) {
                            angular.forEach(modules, function (module) {
                                regInvokes[module] = undefined;
                            });
                        }
                    }
                }
            };
        }];

        // Let's get the list of loaded modules & components
        this._init(angular.element(window.document));
    }]);

    var bootstrapFct = angular.bootstrap;
    angular.bootstrap = function (element, modules, config) {
        // we use slice to make a clean copy
        angular.forEach(modules.slice(), function (module) {
            _addToLoadList(module, true, true);
        });
        return bootstrapFct(element, modules, config);
    };

    var _addToLoadList = function _addToLoadList(name, force, real) {
        if ((recordDeclarations.length > 0 || force) && angular.isString(name) && modulesToLoad.indexOf(name) === -1) {
            modulesToLoad.push(name);
            if (real) {
                realModules.push(name);
            }
        }
    };

    var ngModuleFct = angular.module;
    angular.module = function (name, requires, configFn) {
        _addToLoadList(name, false, true);
        return ngModuleFct(name, requires, configFn);
    };

    // CommonJS package manager support:
    if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
        module.exports = 'oc.lazyLoad';
    }
})(angular, window);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').directive('ocLazyLoad', ["$ocLazyLoad", "$compile", "$animate", "$parse", "$timeout", function ($ocLazyLoad, $compile, $animate, $parse, $timeout) {
        return {
            restrict: 'A',
            terminal: true,
            priority: 1000,
            compile: function compile(element, attrs) {
                // we store the content and remove it before compilation
                var content = element[0].innerHTML;
                element.html('');

                return function ($scope, $element, $attr) {
                    var model = $parse($attr.ocLazyLoad);
                    $scope.$watch(function () {
                        return model($scope) || $attr.ocLazyLoad; // it can be a module name (string), an object, an array, or a scope reference to any of this
                    }, function (moduleName) {
                        if (angular.isDefined(moduleName)) {
                            $ocLazyLoad.load(moduleName).then(function () {
                                // Attach element contents to DOM and then compile them.
                                // This prevents an issue where IE invalidates saved element objects (HTMLCollections)
                                // of the compiled contents when attaching to the parent DOM.
                                $animate.enter(content, $element);
                                // get the new content & compile it
                                $compile($element.contents())($scope);
                            });
                        }
                    }, true);
                };
            }
        };
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$q", "$window", "$interval", function ($delegate, $q, $window, $interval) {
            var uaCssChecked = false,
                useCssLoadPatch = false,
                anchor = $window.document.getElementsByTagName('head')[0] || $window.document.getElementsByTagName('body')[0];

            /**
             * Load a js/css file
             * @param type
             * @param path
             * @param params
             * @returns promise
             */
            $delegate.buildElement = function buildElement(type, path, params) {
                var deferred = $q.defer(),
                    el,
                    loaded,
                    filesCache = $delegate._getFilesCache(),
                    cacheBuster = function cacheBuster(url) {
                    var dc = new Date().getTime();
                    if (url.indexOf('?') >= 0) {
                        if (url.substring(0, url.length - 1) === '&') {
                            return url + '_dc=' + dc;
                        }
                        return url + '&_dc=' + dc;
                    } else {
                        return url + '?_dc=' + dc;
                    }
                };

                // Store the promise early so the file load can be detected by other parallel lazy loads
                // (ie: multiple routes on one page) a 'true' value isn't sufficient
                // as it causes false positive load results.
                if (angular.isUndefined(filesCache.get(path))) {
                    filesCache.put(path, deferred.promise);
                }

                // Switch in case more content types are added later
                switch (type) {
                    case 'css':
                        el = $window.document.createElement('link');
                        el.type = 'text/css';
                        el.rel = 'stylesheet';
                        el.href = params.cache === false ? cacheBuster(path) : path;
                        break;
                    case 'js':
                        el = $window.document.createElement('script');
                        el.src = params.cache === false ? cacheBuster(path) : path;
                        break;
                    default:
                        filesCache.remove(path);
                        deferred.reject(new Error('Requested type "' + type + '" is not known. Could not inject "' + path + '"'));
                        break;
                }
                el.onload = el['onreadystatechange'] = function (e) {
                    if (el['readyState'] && !/^c|loade/.test(el['readyState']) || loaded) return;
                    el.onload = el['onreadystatechange'] = null;
                    loaded = 1;
                    $delegate._broadcast('ocLazyLoad.fileLoaded', path);
                    deferred.resolve();
                };
                el.onerror = function () {
                    filesCache.remove(path);
                    deferred.reject(new Error('Unable to load ' + path));
                };
                el.async = params.serie ? 0 : 1;

                var insertBeforeElem = anchor.lastChild;
                if (params.insertBefore) {
                    var element = angular.element(angular.isDefined(window.jQuery) ? params.insertBefore : document.querySelector(params.insertBefore));
                    if (element && element.length > 0) {
                        insertBeforeElem = element[0];
                    }
                }
                insertBeforeElem.parentNode.insertBefore(el, insertBeforeElem);

                /*
                 The event load or readystatechange doesn't fire in:
                 - iOS < 6       (default mobile browser)
                 - Android < 4.4 (default mobile browser)
                 - Safari < 6    (desktop browser)
                 */
                if (type == 'css') {
                    if (!uaCssChecked) {
                        var ua = $window.navigator.userAgent.toLowerCase();

                        // iOS < 6
                        if (/iP(hone|od|ad)/.test($window.navigator.platform)) {
                            var v = $window.navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
                            var iOSVersion = parseFloat([parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)].join('.'));
                            useCssLoadPatch = iOSVersion < 6;
                        } else if (ua.indexOf("android") > -1) {
                            // Android < 4.4
                            var androidVersion = parseFloat(ua.slice(ua.indexOf("android") + 8));
                            useCssLoadPatch = androidVersion < 4.4;
                        } else if (ua.indexOf('safari') > -1) {
                            var versionMatch = ua.match(/version\/([\.\d]+)/i);
                            useCssLoadPatch = versionMatch && versionMatch[1] && parseFloat(versionMatch[1]) < 6;
                        }
                    }

                    if (useCssLoadPatch) {
                        var tries = 1000; // * 20 = 20000 miliseconds
                        var interval = $interval(function () {
                            try {
                                el.sheet.cssRules;
                                $interval.cancel(interval);
                                el.onload();
                            } catch (e) {
                                if (--tries <= 0) {
                                    el.onerror();
                                }
                            }
                        }, 20);
                    }
                }

                return deferred.promise;
            };

            return $delegate;
        }]);
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$q", function ($delegate, $q) {
            /**
             * The function that loads new files
             * @param config
             * @param params
             * @returns {*}
             */
            $delegate.filesLoader = function filesLoader(config) {
                var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                var cssFiles = [],
                    templatesFiles = [],
                    jsFiles = [],
                    promises = [],
                    cachePromise = null,
                    filesCache = $delegate._getFilesCache();

                $delegate.toggleWatch(true); // start watching angular.module calls

                angular.extend(params, config);

                var pushFile = function pushFile(path) {
                    var file_type = null,
                        m;
                    if (angular.isObject(path)) {
                        file_type = path.type;
                        path = path.path;
                    }
                    cachePromise = filesCache.get(path);
                    if (angular.isUndefined(cachePromise) || params.cache === false) {

                        // always check for requirejs syntax just in case
                        if ((m = /^(css|less|html|htm|js)?(?=!)/.exec(path)) !== null) {
                            // Detect file type using preceding type declaration (ala requireJS)
                            file_type = m[1];
                            path = path.substr(m[1].length + 1, path.length); // Strip the type from the path
                        }

                        if (!file_type) {
                            if ((m = /[.](css|less|html|htm|js)?((\?|#).*)?$/.exec(path)) !== null) {
                                // Detect file type via file extension
                                file_type = m[1];
                            } else if (!$delegate.jsLoader.hasOwnProperty('ocLazyLoadLoader') && $delegate.jsLoader.hasOwnProperty('requirejs')) {
                                // requirejs
                                file_type = 'js';
                            } else {
                                $delegate._$log.error('File type could not be determined. ' + path);
                                return;
                            }
                        }

                        if ((file_type === 'css' || file_type === 'less') && cssFiles.indexOf(path) === -1) {
                            cssFiles.push(path);
                        } else if ((file_type === 'html' || file_type === 'htm') && templatesFiles.indexOf(path) === -1) {
                            templatesFiles.push(path);
                        } else if (file_type === 'js' || jsFiles.indexOf(path) === -1) {
                            jsFiles.push(path);
                        } else {
                            $delegate._$log.error('File type is not valid. ' + path);
                        }
                    } else if (cachePromise) {
                        promises.push(cachePromise);
                    }
                };

                if (params.serie) {
                    pushFile(params.files.shift());
                } else {
                    angular.forEach(params.files, function (path) {
                        pushFile(path);
                    });
                }

                if (cssFiles.length > 0) {
                    var cssDeferred = $q.defer();
                    $delegate.cssLoader(cssFiles, function (err) {
                        if (angular.isDefined(err) && $delegate.cssLoader.hasOwnProperty('ocLazyLoadLoader')) {
                            $delegate._$log.error(err);
                            cssDeferred.reject(err);
                        } else {
                            cssDeferred.resolve();
                        }
                    }, params);
                    promises.push(cssDeferred.promise);
                }

                if (templatesFiles.length > 0) {
                    var templatesDeferred = $q.defer();
                    $delegate.templatesLoader(templatesFiles, function (err) {
                        if (angular.isDefined(err) && $delegate.templatesLoader.hasOwnProperty('ocLazyLoadLoader')) {
                            $delegate._$log.error(err);
                            templatesDeferred.reject(err);
                        } else {
                            templatesDeferred.resolve();
                        }
                    }, params);
                    promises.push(templatesDeferred.promise);
                }

                if (jsFiles.length > 0) {
                    var jsDeferred = $q.defer();
                    $delegate.jsLoader(jsFiles, function (err) {
                        if (angular.isDefined(err) && ($delegate.jsLoader.hasOwnProperty("ocLazyLoadLoader") || $delegate.jsLoader.hasOwnProperty("requirejs"))) {
                            $delegate._$log.error(err);
                            jsDeferred.reject(err);
                        } else {
                            jsDeferred.resolve();
                        }
                    }, params);
                    promises.push(jsDeferred.promise);
                }

                if (promises.length === 0) {
                    var deferred = $q.defer(),
                        err = "Error: no file to load has been found, if you're trying to load an existing module you should use the 'inject' method instead of 'load'.";
                    $delegate._$log.error(err);
                    deferred.reject(err);
                    return deferred.promise;
                } else if (params.serie && params.files.length > 0) {
                    return $q.all(promises).then(function () {
                        return $delegate.filesLoader(config, params);
                    });
                } else {
                    return $q.all(promises)['finally'](function (res) {
                        $delegate.toggleWatch(false); // stop watching angular.module calls
                        return res;
                    });
                }
            };

            /**
             * Load a module or a list of modules into Angular
             * @param module Mixed the name of a predefined module config object, or a module config object, or an array of either
             * @param params Object optional parameters
             * @returns promise
             */
            $delegate.load = function (originalModule) {
                var originalParams = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                var self = this,
                    config = null,
                    deferredList = [],
                    deferred = $q.defer(),
                    errText;

                // clean copy
                var module = angular.copy(originalModule);
                var params = angular.copy(originalParams);

                // If module is an array, break it down
                if (angular.isArray(module)) {
                    // Resubmit each entry as a single module
                    angular.forEach(module, function (m) {
                        deferredList.push(self.load(m, params));
                    });

                    // Resolve the promise once everything has loaded
                    $q.all(deferredList).then(function (res) {
                        deferred.resolve(res);
                    }, function (err) {
                        deferred.reject(err);
                    });

                    return deferred.promise;
                }

                // Get or Set a configuration depending on what was passed in
                if (angular.isString(module)) {
                    config = self.getModuleConfig(module);
                    if (!config) {
                        config = {
                            files: [module]
                        };
                    }
                } else if (angular.isObject(module)) {
                    // case {type: 'js', path: lazyLoadUrl + 'testModule.fakejs'}
                    if (angular.isDefined(module.path) && angular.isDefined(module.type)) {
                        config = {
                            files: [module]
                        };
                    } else {
                        config = self.setModuleConfig(module);
                    }
                }

                if (config === null) {
                    var moduleName = self._getModuleName(module);
                    errText = 'Module "' + (moduleName || 'unknown') + '" is not configured, cannot load.';
                    $delegate._$log.error(errText);
                    deferred.reject(new Error(errText));
                    return deferred.promise;
                } else {
                    // deprecated
                    if (angular.isDefined(config.template)) {
                        if (angular.isUndefined(config.files)) {
                            config.files = [];
                        }
                        if (angular.isString(config.template)) {
                            config.files.push(config.template);
                        } else if (angular.isArray(config.template)) {
                            config.files.concat(config.template);
                        }
                    }
                }

                var localParams = angular.extend({}, params, config);

                // if someone used an external loader and called the load function with just the module name
                if (angular.isUndefined(config.files) && angular.isDefined(config.name) && $delegate.moduleExists(config.name)) {
                    return $delegate.inject(config.name, localParams, true);
                }

                $delegate.filesLoader(config, localParams).then(function () {
                    $delegate.inject(null, localParams).then(function (res) {
                        deferred.resolve(res);
                    }, function (err) {
                        deferred.reject(err);
                    });
                }, function (err) {
                    deferred.reject(err);
                });

                return deferred.promise;
            };

            // return the patched service
            return $delegate;
        }]);
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$q", function ($delegate, $q) {
            /**
             * cssLoader function
             * @type Function
             * @param paths array list of css files to load
             * @param callback to call when everything is loaded. We use a callback and not a promise
             * @param params object config parameters
             * because the user can overwrite cssLoader and it will probably not use promises :(
             */
            $delegate.cssLoader = function (paths, callback, params) {
                var promises = [];
                angular.forEach(paths, function (path) {
                    promises.push($delegate.buildElement('css', path, params));
                });
                $q.all(promises).then(function () {
                    callback();
                }, function (err) {
                    callback(err);
                });
            };
            $delegate.cssLoader.ocLazyLoadLoader = true;

            return $delegate;
        }]);
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$q", function ($delegate, $q) {
            /**
             * jsLoader function
             * @type Function
             * @param paths array list of js files to load
             * @param callback to call when everything is loaded. We use a callback and not a promise
             * @param params object config parameters
             * because the user can overwrite jsLoader and it will probably not use promises :(
             */
            $delegate.jsLoader = function (paths, callback, params) {
                var promises = [];
                angular.forEach(paths, function (path) {
                    promises.push($delegate.buildElement('js', path, params));
                });
                $q.all(promises).then(function () {
                    callback();
                }, function (err) {
                    callback(err);
                });
            };
            $delegate.jsLoader.ocLazyLoadLoader = true;

            return $delegate;
        }]);
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$templateCache", "$q", "$http", function ($delegate, $templateCache, $q, $http) {
            /**
             * templatesLoader function
             * @type Function
             * @param paths array list of css files to load
             * @param callback to call when everything is loaded. We use a callback and not a promise
             * @param params object config parameters for $http
             * because the user can overwrite templatesLoader and it will probably not use promises :(
             */
            $delegate.templatesLoader = function (paths, callback, params) {
                var promises = [],
                    filesCache = $delegate._getFilesCache();

                angular.forEach(paths, function (url) {
                    var deferred = $q.defer();
                    promises.push(deferred.promise);
                    $http.get(url, params).success(function (data) {
                        if (angular.isString(data) && data.length > 0) {
                            angular.forEach(angular.element(data), function (node) {
                                if (node.nodeName === 'SCRIPT' && node.type === 'text/ng-template') {
                                    $templateCache.put(node.id, node.innerHTML);
                                }
                            });
                        }
                        if (angular.isUndefined(filesCache.get(url))) {
                            filesCache.put(url, true);
                        }
                        deferred.resolve();
                    }).error(function (err) {
                        deferred.reject(new Error('Unable to load template file "' + url + '": ' + err));
                    });
                });
                return $q.all(promises).then(function () {
                    callback();
                }, function (err) {
                    callback(err);
                });
            };
            $delegate.templatesLoader.ocLazyLoadLoader = true;

            return $delegate;
        }]);
    }]);
})(angular);
// Array.indexOf polyfill for IE8
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {
        var k;

        // 1. Let O be the result of calling ToObject passing
        //    the this value as the argument.
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }

        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get
        //    internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If len is 0, return -1.
        if (len === 0) {
            return -1;
        }

        // 5. If argument fromIndex was passed let n be
        //    ToInteger(fromIndex); else let n be 0.
        var n = +fromIndex || 0;

        if (Math.abs(n) === Infinity) {
            n = 0;
        }

        // 6. If n >= len, return -1.
        if (n >= len) {
            return -1;
        }

        // 7. If n >= 0, then Let k be n.
        // 8. Else, n<0, Let k be len - abs(n).
        //    If k is less than 0, then let k be 0.
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        // 9. Repeat, while k < len
        while (k < len) {
            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the
            //    HasProperty internal method of O with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            //    i.  Let elementK be the result of calling the Get
            //        internal method of O with the argument ToString(k).
            //   ii.  Let same be the result of applying the
            //        Strict Equality Comparison Algorithm to
            //        searchElement and elementK.
            //  iii.  If same is true, return k.
            if (k in O && O[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 1.3.2 - 2016-04-14
 * License: MIT
 */angular.module("ui.bootstrap", ["ui.bootstrap.tpls", "ui.bootstrap.collapse","ui.bootstrap.accordion","ui.bootstrap.alert","ui.bootstrap.buttons","ui.bootstrap.carousel","ui.bootstrap.dateparser","ui.bootstrap.isClass","ui.bootstrap.datepicker","ui.bootstrap.position","ui.bootstrap.datepickerPopup","ui.bootstrap.debounce","ui.bootstrap.dropdown","ui.bootstrap.stackedMap","ui.bootstrap.modal","ui.bootstrap.paging","ui.bootstrap.pager","ui.bootstrap.pagination","ui.bootstrap.tooltip","ui.bootstrap.popover","ui.bootstrap.progressbar","ui.bootstrap.rating","ui.bootstrap.tabs","ui.bootstrap.timepicker","ui.bootstrap.typeahead"]);
angular.module("ui.bootstrap.tpls", ["uib/template/accordion/accordion-group.html","uib/template/accordion/accordion.html","uib/template/alert/alert.html","uib/template/carousel/carousel.html","uib/template/carousel/slide.html","uib/template/datepicker/datepicker.html","uib/template/datepicker/day.html","uib/template/datepicker/month.html","uib/template/datepicker/year.html","uib/template/datepickerPopup/popup.html","uib/template/modal/backdrop.html","uib/template/modal/window.html","uib/template/pager/pager.html","uib/template/pagination/pagination.html","uib/template/tooltip/tooltip-html-popup.html","uib/template/tooltip/tooltip-popup.html","uib/template/tooltip/tooltip-template-popup.html","uib/template/popover/popover-html.html","uib/template/popover/popover-template.html","uib/template/popover/popover.html","uib/template/progressbar/bar.html","uib/template/progressbar/progress.html","uib/template/progressbar/progressbar.html","uib/template/rating/rating.html","uib/template/tabs/tab.html","uib/template/tabs/tabset.html","uib/template/timepicker/timepicker.html","uib/template/typeahead/typeahead-match.html","uib/template/typeahead/typeahead-popup.html"]);
angular.module('ui.bootstrap.collapse', [])

  .directive('uibCollapse', ['$animate', '$q', '$parse', '$injector', function($animate, $q, $parse, $injector) {
    var $animateCss = $injector.has('$animateCss') ? $injector.get('$animateCss') : null;
    return {
      link: function(scope, element, attrs) {
        var expandingExpr = $parse(attrs.expanding),
            expandedExpr = $parse(attrs.expanded),
            collapsingExpr = $parse(attrs.collapsing),
            collapsedExpr = $parse(attrs.collapsed);

        if (!scope.$eval(attrs.uibCollapse)) {
          element.addClass('in')
            .addClass('collapse')
            .attr('aria-expanded', true)
            .attr('aria-hidden', false)
            .css({height: 'auto'});
        }

        function expand() {
          if (element.hasClass('collapse') && element.hasClass('in')) {
            return;
          }

          $q.resolve(expandingExpr(scope))
            .then(function() {
              element.removeClass('collapse')
                .addClass('collapsing')
                .attr('aria-expanded', true)
                .attr('aria-hidden', false);

              if ($animateCss) {
                $animateCss(element, {
                  addClass: 'in',
                  easing: 'ease',
                  to: { height: element[0].scrollHeight + 'px' }
                }).start()['finally'](expandDone);
              } else {
                $animate.addClass(element, 'in', {
                  to: { height: element[0].scrollHeight + 'px' }
                }).then(expandDone);
              }
            });
        }

        function expandDone() {
          element.removeClass('collapsing')
            .addClass('collapse')
            .css({height: 'auto'});
          expandedExpr(scope);
        }

        function collapse() {
          if (!element.hasClass('collapse') && !element.hasClass('in')) {
            return collapseDone();
          }

          $q.resolve(collapsingExpr(scope))
            .then(function() {
              element
                // IMPORTANT: The height must be set before adding "collapsing" class.
                // Otherwise, the browser attempts to animate from height 0 (in
                // collapsing class) to the given height here.
                .css({height: element[0].scrollHeight + 'px'})
                // initially all panel collapse have the collapse class, this removal
                // prevents the animation from jumping to collapsed state
                .removeClass('collapse')
                .addClass('collapsing')
                .attr('aria-expanded', false)
                .attr('aria-hidden', true);

              if ($animateCss) {
                $animateCss(element, {
                  removeClass: 'in',
                  to: {height: '0'}
                }).start()['finally'](collapseDone);
              } else {
                $animate.removeClass(element, 'in', {
                  to: {height: '0'}
                }).then(collapseDone);
              }
            });
        }

        function collapseDone() {
          element.css({height: '0'}); // Required so that collapse works when animation is disabled
          element.removeClass('collapsing')
            .addClass('collapse');
          collapsedExpr(scope);
        }

        scope.$watch(attrs.uibCollapse, function(shouldCollapse) {
          if (shouldCollapse) {
            collapse();
          } else {
            expand();
          }
        });
      }
    };
  }]);

angular.module('ui.bootstrap.accordion', ['ui.bootstrap.collapse'])

.constant('uibAccordionConfig', {
  closeOthers: true
})

.controller('UibAccordionController', ['$scope', '$attrs', 'uibAccordionConfig', function($scope, $attrs, accordionConfig) {
  // This array keeps track of the accordion groups
  this.groups = [];

  // Ensure that all the groups in this accordion are closed, unless close-others explicitly says not to
  this.closeOthers = function(openGroup) {
    var closeOthers = angular.isDefined($attrs.closeOthers) ?
      $scope.$eval($attrs.closeOthers) : accordionConfig.closeOthers;
    if (closeOthers) {
      angular.forEach(this.groups, function(group) {
        if (group !== openGroup) {
          group.isOpen = false;
        }
      });
    }
  };

  // This is called from the accordion-group directive to add itself to the accordion
  this.addGroup = function(groupScope) {
    var that = this;
    this.groups.push(groupScope);

    groupScope.$on('$destroy', function(event) {
      that.removeGroup(groupScope);
    });
  };

  // This is called from the accordion-group directive when to remove itself
  this.removeGroup = function(group) {
    var index = this.groups.indexOf(group);
    if (index !== -1) {
      this.groups.splice(index, 1);
    }
  };
}])

// The accordion directive simply sets up the directive controller
// and adds an accordion CSS class to itself element.
.directive('uibAccordion', function() {
  return {
    controller: 'UibAccordionController',
    controllerAs: 'accordion',
    transclude: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/accordion/accordion.html';
    }
  };
})

// The accordion-group directive indicates a block of html that will expand and collapse in an accordion
.directive('uibAccordionGroup', function() {
  return {
    require: '^uibAccordion',         // We need this directive to be inside an accordion
    transclude: true,              // It transcludes the contents of the directive into the template
    replace: true,                // The element containing the directive will be replaced with the template
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/accordion/accordion-group.html';
    },
    scope: {
      heading: '@',               // Interpolate the heading attribute onto this scope
      panelClass: '@?',           // Ditto with panelClass
      isOpen: '=?',
      isDisabled: '=?'
    },
    controller: function() {
      this.setHeading = function(element) {
        this.heading = element;
      };
    },
    link: function(scope, element, attrs, accordionCtrl) {
      accordionCtrl.addGroup(scope);

      scope.openClass = attrs.openClass || 'panel-open';
      scope.panelClass = attrs.panelClass || 'panel-default';
      scope.$watch('isOpen', function(value) {
        element.toggleClass(scope.openClass, !!value);
        if (value) {
          accordionCtrl.closeOthers(scope);
        }
      });

      scope.toggleOpen = function($event) {
        if (!scope.isDisabled) {
          if (!$event || $event.which === 32) {
            scope.isOpen = !scope.isOpen;
          }
        }
      };

      var id = 'accordiongroup-' + scope.$id + '-' + Math.floor(Math.random() * 10000);
      scope.headingId = id + '-tab';
      scope.panelId = id + '-panel';
    }
  };
})

// Use accordion-heading below an accordion-group to provide a heading containing HTML
.directive('uibAccordionHeading', function() {
  return {
    transclude: true,   // Grab the contents to be used as the heading
    template: '',       // In effect remove this element!
    replace: true,
    require: '^uibAccordionGroup',
    link: function(scope, element, attrs, accordionGroupCtrl, transclude) {
      // Pass the heading to the accordion-group controller
      // so that it can be transcluded into the right place in the template
      // [The second parameter to transclude causes the elements to be cloned so that they work in ng-repeat]
      accordionGroupCtrl.setHeading(transclude(scope, angular.noop));
    }
  };
})

// Use in the accordion-group template to indicate where you want the heading to be transcluded
// You must provide the property on the accordion-group controller that will hold the transcluded element
.directive('uibAccordionTransclude', function() {
  return {
    require: '^uibAccordionGroup',
    link: function(scope, element, attrs, controller) {
      scope.$watch(function() { return controller[attrs.uibAccordionTransclude]; }, function(heading) {
        if (heading) {
          var elem = angular.element(element[0].querySelector('[uib-accordion-header]'));
          elem.html('');
          elem.append(heading);
        }
      });
    }
  };
});

angular.module('ui.bootstrap.alert', [])

.controller('UibAlertController', ['$scope', '$attrs', '$interpolate', '$timeout', function($scope, $attrs, $interpolate, $timeout) {
  $scope.closeable = !!$attrs.close;

  var dismissOnTimeout = angular.isDefined($attrs.dismissOnTimeout) ?
    $interpolate($attrs.dismissOnTimeout)($scope.$parent) : null;

  if (dismissOnTimeout) {
    $timeout(function() {
      $scope.close();
    }, parseInt(dismissOnTimeout, 10));
  }
}])

.directive('uibAlert', function() {
  return {
    controller: 'UibAlertController',
    controllerAs: 'alert',
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/alert/alert.html';
    },
    transclude: true,
    replace: true,
    scope: {
      type: '@',
      close: '&'
    }
  };
});

angular.module('ui.bootstrap.buttons', [])

.constant('uibButtonConfig', {
  activeClass: 'active',
  toggleEvent: 'click'
})

.controller('UibButtonsController', ['uibButtonConfig', function(buttonConfig) {
  this.activeClass = buttonConfig.activeClass || 'active';
  this.toggleEvent = buttonConfig.toggleEvent || 'click';
}])

.directive('uibBtnRadio', ['$parse', function($parse) {
  return {
    require: ['uibBtnRadio', 'ngModel'],
    controller: 'UibButtonsController',
    controllerAs: 'buttons',
    link: function(scope, element, attrs, ctrls) {
      var buttonsCtrl = ctrls[0], ngModelCtrl = ctrls[1];
      var uncheckableExpr = $parse(attrs.uibUncheckable);

      element.find('input').css({display: 'none'});

      //model -> UI
      ngModelCtrl.$render = function() {
        element.toggleClass(buttonsCtrl.activeClass, angular.equals(ngModelCtrl.$modelValue, scope.$eval(attrs.uibBtnRadio)));
      };

      //ui->model
      element.on(buttonsCtrl.toggleEvent, function() {
        if (attrs.disabled) {
          return;
        }

        var isActive = element.hasClass(buttonsCtrl.activeClass);

        if (!isActive || angular.isDefined(attrs.uncheckable)) {
          scope.$apply(function() {
            ngModelCtrl.$setViewValue(isActive ? null : scope.$eval(attrs.uibBtnRadio));
            ngModelCtrl.$render();
          });
        }
      });

      if (attrs.uibUncheckable) {
        scope.$watch(uncheckableExpr, function(uncheckable) {
          attrs.$set('uncheckable', uncheckable ? '' : undefined);
        });
      }
    }
  };
}])

.directive('uibBtnCheckbox', function() {
  return {
    require: ['uibBtnCheckbox', 'ngModel'],
    controller: 'UibButtonsController',
    controllerAs: 'button',
    link: function(scope, element, attrs, ctrls) {
      var buttonsCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      element.find('input').css({display: 'none'});

      function getTrueValue() {
        return getCheckboxValue(attrs.btnCheckboxTrue, true);
      }

      function getFalseValue() {
        return getCheckboxValue(attrs.btnCheckboxFalse, false);
      }

      function getCheckboxValue(attribute, defaultValue) {
        return angular.isDefined(attribute) ? scope.$eval(attribute) : defaultValue;
      }

      //model -> UI
      ngModelCtrl.$render = function() {
        element.toggleClass(buttonsCtrl.activeClass, angular.equals(ngModelCtrl.$modelValue, getTrueValue()));
      };

      //ui->model
      element.on(buttonsCtrl.toggleEvent, function() {
        if (attrs.disabled) {
          return;
        }

        scope.$apply(function() {
          ngModelCtrl.$setViewValue(element.hasClass(buttonsCtrl.activeClass) ? getFalseValue() : getTrueValue());
          ngModelCtrl.$render();
        });
      });
    }
  };
});

angular.module('ui.bootstrap.carousel', [])

.controller('UibCarouselController', ['$scope', '$element', '$interval', '$timeout', '$animate', function($scope, $element, $interval, $timeout, $animate) {
  var self = this,
    slides = self.slides = $scope.slides = [],
    SLIDE_DIRECTION = 'uib-slideDirection',
    currentIndex = $scope.active,
    currentInterval, isPlaying, bufferedTransitions = [];

  var destroyed = false;

  self.addSlide = function(slide, element) {
    slides.push({
      slide: slide,
      element: element
    });
    slides.sort(function(a, b) {
      return +a.slide.index - +b.slide.index;
    });
    //if this is the first slide or the slide is set to active, select it
    if (slide.index === $scope.active || slides.length === 1 && !angular.isNumber($scope.active)) {
      if ($scope.$currentTransition) {
        $scope.$currentTransition = null;
      }

      currentIndex = slide.index;
      $scope.active = slide.index;
      setActive(currentIndex);
      self.select(slides[findSlideIndex(slide)]);
      if (slides.length === 1) {
        $scope.play();
      }
    }
  };

  self.getCurrentIndex = function() {
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].slide.index === currentIndex) {
        return i;
      }
    }
  };

  self.next = $scope.next = function() {
    var newIndex = (self.getCurrentIndex() + 1) % slides.length;

    if (newIndex === 0 && $scope.noWrap()) {
      $scope.pause();
      return;
    }

    return self.select(slides[newIndex], 'next');
  };

  self.prev = $scope.prev = function() {
    var newIndex = self.getCurrentIndex() - 1 < 0 ? slides.length - 1 : self.getCurrentIndex() - 1;

    if ($scope.noWrap() && newIndex === slides.length - 1) {
      $scope.pause();
      return;
    }

    return self.select(slides[newIndex], 'prev');
  };

  self.removeSlide = function(slide) {
    var index = findSlideIndex(slide);

    var bufferedIndex = bufferedTransitions.indexOf(slides[index]);
    if (bufferedIndex !== -1) {
      bufferedTransitions.splice(bufferedIndex, 1);
    }

    //get the index of the slide inside the carousel
    slides.splice(index, 1);
    if (slides.length > 0 && currentIndex === index) {
      if (index >= slides.length) {
        currentIndex = slides.length - 1;
        $scope.active = currentIndex;
        setActive(currentIndex);
        self.select(slides[slides.length - 1]);
      } else {
        currentIndex = index;
        $scope.active = currentIndex;
        setActive(currentIndex);
        self.select(slides[index]);
      }
    } else if (currentIndex > index) {
      currentIndex--;
      $scope.active = currentIndex;
    }

    //clean the active value when no more slide
    if (slides.length === 0) {
      currentIndex = null;
      $scope.active = null;
      clearBufferedTransitions();
    }
  };

  /* direction: "prev" or "next" */
  self.select = $scope.select = function(nextSlide, direction) {
    var nextIndex = findSlideIndex(nextSlide.slide);
    //Decide direction if it's not given
    if (direction === undefined) {
      direction = nextIndex > self.getCurrentIndex() ? 'next' : 'prev';
    }
    //Prevent this user-triggered transition from occurring if there is already one in progress
    if (nextSlide.slide.index !== currentIndex &&
      !$scope.$currentTransition) {
      goNext(nextSlide.slide, nextIndex, direction);
    } else if (nextSlide && nextSlide.slide.index !== currentIndex && $scope.$currentTransition) {
      bufferedTransitions.push(slides[nextIndex]);
    }
  };

  /* Allow outside people to call indexOf on slides array */
  $scope.indexOfSlide = function(slide) {
    return +slide.slide.index;
  };

  $scope.isActive = function(slide) {
    return $scope.active === slide.slide.index;
  };

  $scope.isPrevDisabled = function() {
    return $scope.active === 0 && $scope.noWrap();
  };

  $scope.isNextDisabled = function() {
    return $scope.active === slides.length - 1 && $scope.noWrap();
  };

  $scope.pause = function() {
    if (!$scope.noPause) {
      isPlaying = false;
      resetTimer();
    }
  };

  $scope.play = function() {
    if (!isPlaying) {
      isPlaying = true;
      restartTimer();
    }
  };

  $scope.$on('$destroy', function() {
    destroyed = true;
    resetTimer();
  });

  $scope.$watch('noTransition', function(noTransition) {
    $animate.enabled($element, !noTransition);
  });

  $scope.$watch('interval', restartTimer);

  $scope.$watchCollection('slides', resetTransition);

  $scope.$watch('active', function(index) {
    if (angular.isNumber(index) && currentIndex !== index) {
      for (var i = 0; i < slides.length; i++) {
        if (slides[i].slide.index === index) {
          index = i;
          break;
        }
      }

      var slide = slides[index];
      if (slide) {
        setActive(index);
        self.select(slides[index]);
        currentIndex = index;
      }
    }
  });

  function clearBufferedTransitions() {
    while (bufferedTransitions.length) {
      bufferedTransitions.shift();
    }
  }

  function getSlideByIndex(index) {
    for (var i = 0, l = slides.length; i < l; ++i) {
      if (slides[i].index === index) {
        return slides[i];
      }
    }
  }

  function setActive(index) {
    for (var i = 0; i < slides.length; i++) {
      slides[i].slide.active = i === index;
    }
  }

  function goNext(slide, index, direction) {
    if (destroyed) {
      return;
    }

    angular.extend(slide, {direction: direction});
    angular.extend(slides[currentIndex].slide || {}, {direction: direction});
    if ($animate.enabled($element) && !$scope.$currentTransition &&
      slides[index].element && self.slides.length > 1) {
      slides[index].element.data(SLIDE_DIRECTION, slide.direction);
      var currentIdx = self.getCurrentIndex();

      if (angular.isNumber(currentIdx) && slides[currentIdx].element) {
        slides[currentIdx].element.data(SLIDE_DIRECTION, slide.direction);
      }

      $scope.$currentTransition = true;
      $animate.on('addClass', slides[index].element, function(element, phase) {
        if (phase === 'close') {
          $scope.$currentTransition = null;
          $animate.off('addClass', element);
          if (bufferedTransitions.length) {
            var nextSlide = bufferedTransitions.pop().slide;
            var nextIndex = nextSlide.index;
            var nextDirection = nextIndex > self.getCurrentIndex() ? 'next' : 'prev';
            clearBufferedTransitions();

            goNext(nextSlide, nextIndex, nextDirection);
          }
        }
      });
    }

    $scope.active = slide.index;
    currentIndex = slide.index;
    setActive(index);

    //every time you change slides, reset the timer
    restartTimer();
  }

  function findSlideIndex(slide) {
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].slide === slide) {
        return i;
      }
    }
  }

  function resetTimer() {
    if (currentInterval) {
      $interval.cancel(currentInterval);
      currentInterval = null;
    }
  }

  function resetTransition(slides) {
    if (!slides.length) {
      $scope.$currentTransition = null;
      clearBufferedTransitions();
    }
  }

  function restartTimer() {
    resetTimer();
    var interval = +$scope.interval;
    if (!isNaN(interval) && interval > 0) {
      currentInterval = $interval(timerFn, interval);
    }
  }

  function timerFn() {
    var interval = +$scope.interval;
    if (isPlaying && !isNaN(interval) && interval > 0 && slides.length) {
      $scope.next();
    } else {
      $scope.pause();
    }
  }
}])

.directive('uibCarousel', function() {
  return {
    transclude: true,
    replace: true,
    controller: 'UibCarouselController',
    controllerAs: 'carousel',
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/carousel/carousel.html';
    },
    scope: {
      active: '=',
      interval: '=',
      noTransition: '=',
      noPause: '=',
      noWrap: '&'
    }
  };
})

.directive('uibSlide', function() {
  return {
    require: '^uibCarousel',
    transclude: true,
    replace: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/carousel/slide.html';
    },
    scope: {
      actual: '=?',
      index: '=?'
    },
    link: function (scope, element, attrs, carouselCtrl) {
      carouselCtrl.addSlide(scope, element);
      //when the scope is destroyed then remove the slide from the current slides array
      scope.$on('$destroy', function() {
        carouselCtrl.removeSlide(scope);
      });
    }
  };
})

.animation('.item', ['$animateCss',
function($animateCss) {
  var SLIDE_DIRECTION = 'uib-slideDirection';

  function removeClass(element, className, callback) {
    element.removeClass(className);
    if (callback) {
      callback();
    }
  }

  return {
    beforeAddClass: function(element, className, done) {
      if (className === 'active') {
        var stopped = false;
        var direction = element.data(SLIDE_DIRECTION);
        var directionClass = direction === 'next' ? 'left' : 'right';
        var removeClassFn = removeClass.bind(this, element,
          directionClass + ' ' + direction, done);
        element.addClass(direction);

        $animateCss(element, {addClass: directionClass})
          .start()
          .done(removeClassFn);

        return function() {
          stopped = true;
        };
      }
      done();
    },
    beforeRemoveClass: function (element, className, done) {
      if (className === 'active') {
        var stopped = false;
        var direction = element.data(SLIDE_DIRECTION);
        var directionClass = direction === 'next' ? 'left' : 'right';
        var removeClassFn = removeClass.bind(this, element, directionClass, done);

        $animateCss(element, {addClass: directionClass})
          .start()
          .done(removeClassFn);

        return function() {
          stopped = true;
        };
      }
      done();
    }
  };
}]);

angular.module('ui.bootstrap.dateparser', [])

.service('uibDateParser', ['$log', '$locale', 'dateFilter', 'orderByFilter', function($log, $locale, dateFilter, orderByFilter) {
  // Pulled from https://github.com/mbostock/d3/blob/master/src/format/requote.js
  var SPECIAL_CHARACTERS_REGEXP = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

  var localeId;
  var formatCodeToRegex;

  this.init = function() {
    localeId = $locale.id;

    this.parsers = {};
    this.formatters = {};

    formatCodeToRegex = [
      {
        key: 'yyyy',
        regex: '\\d{4}',
        apply: function(value) { this.year = +value; },
        formatter: function(date) {
          var _date = new Date();
          _date.setFullYear(Math.abs(date.getFullYear()));
          return dateFilter(_date, 'yyyy');
        }
      },
      {
        key: 'yy',
        regex: '\\d{2}',
        apply: function(value) { value = +value; this.year = value < 69 ? value + 2000 : value + 1900; },
        formatter: function(date) {
          var _date = new Date();
          _date.setFullYear(Math.abs(date.getFullYear()));
          return dateFilter(_date, 'yy');
        }
      },
      {
        key: 'y',
        regex: '\\d{1,4}',
        apply: function(value) { this.year = +value; },
        formatter: function(date) {
          var _date = new Date();
          _date.setFullYear(Math.abs(date.getFullYear()));
          return dateFilter(_date, 'y');
        }
      },
      {
        key: 'M!',
        regex: '0?[1-9]|1[0-2]',
        apply: function(value) { this.month = value - 1; },
        formatter: function(date) {
          var value = date.getMonth();
          if (/^[0-9]$/.test(value)) {
            return dateFilter(date, 'MM');
          }

          return dateFilter(date, 'M');
        }
      },
      {
        key: 'MMMM',
        regex: $locale.DATETIME_FORMATS.MONTH.join('|'),
        apply: function(value) { this.month = $locale.DATETIME_FORMATS.MONTH.indexOf(value); },
        formatter: function(date) { return dateFilter(date, 'MMMM'); }
      },
      {
        key: 'MMM',
        regex: $locale.DATETIME_FORMATS.SHORTMONTH.join('|'),
        apply: function(value) { this.month = $locale.DATETIME_FORMATS.SHORTMONTH.indexOf(value); },
        formatter: function(date) { return dateFilter(date, 'MMM'); }
      },
      {
        key: 'MM',
        regex: '0[1-9]|1[0-2]',
        apply: function(value) { this.month = value - 1; },
        formatter: function(date) { return dateFilter(date, 'MM'); }
      },
      {
        key: 'M',
        regex: '[1-9]|1[0-2]',
        apply: function(value) { this.month = value - 1; },
        formatter: function(date) { return dateFilter(date, 'M'); }
      },
      {
        key: 'd!',
        regex: '[0-2]?[0-9]{1}|3[0-1]{1}',
        apply: function(value) { this.date = +value; },
        formatter: function(date) {
          var value = date.getDate();
          if (/^[1-9]$/.test(value)) {
            return dateFilter(date, 'dd');
          }

          return dateFilter(date, 'd');
        }
      },
      {
        key: 'dd',
        regex: '[0-2][0-9]{1}|3[0-1]{1}',
        apply: function(value) { this.date = +value; },
        formatter: function(date) { return dateFilter(date, 'dd'); }
      },
      {
        key: 'd',
        regex: '[1-2]?[0-9]{1}|3[0-1]{1}',
        apply: function(value) { this.date = +value; },
        formatter: function(date) { return dateFilter(date, 'd'); }
      },
      {
        key: 'EEEE',
        regex: $locale.DATETIME_FORMATS.DAY.join('|'),
        formatter: function(date) { return dateFilter(date, 'EEEE'); }
      },
      {
        key: 'EEE',
        regex: $locale.DATETIME_FORMATS.SHORTDAY.join('|'),
        formatter: function(date) { return dateFilter(date, 'EEE'); }
      },
      {
        key: 'HH',
        regex: '(?:0|1)[0-9]|2[0-3]',
        apply: function(value) { this.hours = +value; },
        formatter: function(date) { return dateFilter(date, 'HH'); }
      },
      {
        key: 'hh',
        regex: '0[0-9]|1[0-2]',
        apply: function(value) { this.hours = +value; },
        formatter: function(date) { return dateFilter(date, 'hh'); }
      },
      {
        key: 'H',
        regex: '1?[0-9]|2[0-3]',
        apply: function(value) { this.hours = +value; },
        formatter: function(date) { return dateFilter(date, 'H'); }
      },
      {
        key: 'h',
        regex: '[0-9]|1[0-2]',
        apply: function(value) { this.hours = +value; },
        formatter: function(date) { return dateFilter(date, 'h'); }
      },
      {
        key: 'mm',
        regex: '[0-5][0-9]',
        apply: function(value) { this.minutes = +value; },
        formatter: function(date) { return dateFilter(date, 'mm'); }
      },
      {
        key: 'm',
        regex: '[0-9]|[1-5][0-9]',
        apply: function(value) { this.minutes = +value; },
        formatter: function(date) { return dateFilter(date, 'm'); }
      },
      {
        key: 'sss',
        regex: '[0-9][0-9][0-9]',
        apply: function(value) { this.milliseconds = +value; },
        formatter: function(date) { return dateFilter(date, 'sss'); }
      },
      {
        key: 'ss',
        regex: '[0-5][0-9]',
        apply: function(value) { this.seconds = +value; },
        formatter: function(date) { return dateFilter(date, 'ss'); }
      },
      {
        key: 's',
        regex: '[0-9]|[1-5][0-9]',
        apply: function(value) { this.seconds = +value; },
        formatter: function(date) { return dateFilter(date, 's'); }
      },
      {
        key: 'a',
        regex: $locale.DATETIME_FORMATS.AMPMS.join('|'),
        apply: function(value) {
          if (this.hours === 12) {
            this.hours = 0;
          }

          if (value === 'PM') {
            this.hours += 12;
          }
        },
        formatter: function(date) { return dateFilter(date, 'a'); }
      },
      {
        key: 'Z',
        regex: '[+-]\\d{4}',
        apply: function(value) {
          var matches = value.match(/([+-])(\d{2})(\d{2})/),
            sign = matches[1],
            hours = matches[2],
            minutes = matches[3];
          this.hours += toInt(sign + hours);
          this.minutes += toInt(sign + minutes);
        },
        formatter: function(date) {
          return dateFilter(date, 'Z');
        }
      },
      {
        key: 'ww',
        regex: '[0-4][0-9]|5[0-3]',
        formatter: function(date) { return dateFilter(date, 'ww'); }
      },
      {
        key: 'w',
        regex: '[0-9]|[1-4][0-9]|5[0-3]',
        formatter: function(date) { return dateFilter(date, 'w'); }
      },
      {
        key: 'GGGG',
        regex: $locale.DATETIME_FORMATS.ERANAMES.join('|').replace(/\s/g, '\\s'),
        formatter: function(date) { return dateFilter(date, 'GGGG'); }
      },
      {
        key: 'GGG',
        regex: $locale.DATETIME_FORMATS.ERAS.join('|'),
        formatter: function(date) { return dateFilter(date, 'GGG'); }
      },
      {
        key: 'GG',
        regex: $locale.DATETIME_FORMATS.ERAS.join('|'),
        formatter: function(date) { return dateFilter(date, 'GG'); }
      },
      {
        key: 'G',
        regex: $locale.DATETIME_FORMATS.ERAS.join('|'),
        formatter: function(date) { return dateFilter(date, 'G'); }
      }
    ];
  };

  this.init();

  function createParser(format, func) {
    var map = [], regex = format.split('');

    // check for literal values
    var quoteIndex = format.indexOf('\'');
    if (quoteIndex > -1) {
      var inLiteral = false;
      format = format.split('');
      for (var i = quoteIndex; i < format.length; i++) {
        if (inLiteral) {
          if (format[i] === '\'') {
            if (i + 1 < format.length && format[i+1] === '\'') { // escaped single quote
              format[i+1] = '$';
              regex[i+1] = '';
            } else { // end of literal
              regex[i] = '';
              inLiteral = false;
            }
          }
          format[i] = '$';
        } else {
          if (format[i] === '\'') { // start of literal
            format[i] = '$';
            regex[i] = '';
            inLiteral = true;
          }
        }
      }

      format = format.join('');
    }

    angular.forEach(formatCodeToRegex, function(data) {
      var index = format.indexOf(data.key);

      if (index > -1) {
        format = format.split('');

        regex[index] = '(' + data.regex + ')';
        format[index] = '$'; // Custom symbol to define consumed part of format
        for (var i = index + 1, n = index + data.key.length; i < n; i++) {
          regex[i] = '';
          format[i] = '$';
        }
        format = format.join('');

        map.push({
          index: index,
          key: data.key,
          apply: data[func],
          matcher: data.regex
        });
      }
    });

    return {
      regex: new RegExp('^' + regex.join('') + '$'),
      map: orderByFilter(map, 'index')
    };
  }

  this.filter = function(date, format) {
    if (!angular.isDate(date) || isNaN(date) || !format) {
      return '';
    }

    format = $locale.DATETIME_FORMATS[format] || format;

    if ($locale.id !== localeId) {
      this.init();
    }

    if (!this.formatters[format]) {
      this.formatters[format] = createParser(format, 'formatter');
    }

    var parser = this.formatters[format],
      map = parser.map;

    var _format = format;

    return map.reduce(function(str, mapper, i) {
      var match = _format.match(new RegExp('(.*)' + mapper.key));
      if (match && angular.isString(match[1])) {
        str += match[1];
        _format = _format.replace(match[1] + mapper.key, '');
      }

      var endStr = i === map.length - 1 ? _format : '';

      if (mapper.apply) {
        return str + mapper.apply.call(null, date) + endStr;
      }

      return str + endStr;
    }, '');
  };

  this.parse = function(input, format, baseDate) {
    if (!angular.isString(input) || !format) {
      return input;
    }

    format = $locale.DATETIME_FORMATS[format] || format;
    format = format.replace(SPECIAL_CHARACTERS_REGEXP, '\\$&');

    if ($locale.id !== localeId) {
      this.init();
    }

    if (!this.parsers[format]) {
      this.parsers[format] = createParser(format, 'apply');
    }

    var parser = this.parsers[format],
        regex = parser.regex,
        map = parser.map,
        results = input.match(regex),
        tzOffset = false;
    if (results && results.length) {
      var fields, dt;
      if (angular.isDate(baseDate) && !isNaN(baseDate.getTime())) {
        fields = {
          year: baseDate.getFullYear(),
          month: baseDate.getMonth(),
          date: baseDate.getDate(),
          hours: baseDate.getHours(),
          minutes: baseDate.getMinutes(),
          seconds: baseDate.getSeconds(),
          milliseconds: baseDate.getMilliseconds()
        };
      } else {
        if (baseDate) {
          $log.warn('dateparser:', 'baseDate is not a valid date');
        }
        fields = { year: 1900, month: 0, date: 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
      }

      for (var i = 1, n = results.length; i < n; i++) {
        var mapper = map[i - 1];
        if (mapper.matcher === 'Z') {
          tzOffset = true;
        }

        if (mapper.apply) {
          mapper.apply.call(fields, results[i]);
        }
      }

      var datesetter = tzOffset ? Date.prototype.setUTCFullYear :
        Date.prototype.setFullYear;
      var timesetter = tzOffset ? Date.prototype.setUTCHours :
        Date.prototype.setHours;

      if (isValid(fields.year, fields.month, fields.date)) {
        if (angular.isDate(baseDate) && !isNaN(baseDate.getTime()) && !tzOffset) {
          dt = new Date(baseDate);
          datesetter.call(dt, fields.year, fields.month, fields.date);
          timesetter.call(dt, fields.hours, fields.minutes,
            fields.seconds, fields.milliseconds);
        } else {
          dt = new Date(0);
          datesetter.call(dt, fields.year, fields.month, fields.date);
          timesetter.call(dt, fields.hours || 0, fields.minutes || 0,
            fields.seconds || 0, fields.milliseconds || 0);
        }
      }

      return dt;
    }
  };

  // Check if date is valid for specific month (and year for February).
  // Month: 0 = Jan, 1 = Feb, etc
  function isValid(year, month, date) {
    if (date < 1) {
      return false;
    }

    if (month === 1 && date > 28) {
      return date === 29 && (year % 4 === 0 && year % 100 !== 0 || year % 400 === 0);
    }

    if (month === 3 || month === 5 || month === 8 || month === 10) {
      return date < 31;
    }

    return true;
  }

  function toInt(str) {
    return parseInt(str, 10);
  }

  this.toTimezone = toTimezone;
  this.fromTimezone = fromTimezone;
  this.timezoneToOffset = timezoneToOffset;
  this.addDateMinutes = addDateMinutes;
  this.convertTimezoneToLocal = convertTimezoneToLocal;

  function toTimezone(date, timezone) {
    return date && timezone ? convertTimezoneToLocal(date, timezone) : date;
  }

  function fromTimezone(date, timezone) {
    return date && timezone ? convertTimezoneToLocal(date, timezone, true) : date;
  }

  //https://github.com/angular/angular.js/blob/4daafd3dbe6a80d578f5a31df1bb99c77559543e/src/Angular.js#L1207
  function timezoneToOffset(timezone, fallback) {
    var requestedTimezoneOffset = Date.parse('Jan 01, 1970 00:00:00 ' + timezone) / 60000;
    return isNaN(requestedTimezoneOffset) ? fallback : requestedTimezoneOffset;
  }

  function addDateMinutes(date, minutes) {
    date = new Date(date.getTime());
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }

  function convertTimezoneToLocal(date, timezone, reverse) {
    reverse = reverse ? -1 : 1;
    var timezoneOffset = timezoneToOffset(timezone, date.getTimezoneOffset());
    return addDateMinutes(date, reverse * (timezoneOffset - date.getTimezoneOffset()));
  }
}]);

// Avoiding use of ng-class as it creates a lot of watchers when a class is to be applied to
// at most one element.
angular.module('ui.bootstrap.isClass', [])
.directive('uibIsClass', [
         '$animate',
function ($animate) {
  //                    11111111          22222222
  var ON_REGEXP = /^\s*([\s\S]+?)\s+on\s+([\s\S]+?)\s*$/;
  //                    11111111           22222222
  var IS_REGEXP = /^\s*([\s\S]+?)\s+for\s+([\s\S]+?)\s*$/;

  var dataPerTracked = {};

  return {
    restrict: 'A',
    compile: function(tElement, tAttrs) {
      var linkedScopes = [];
      var instances = [];
      var expToData = {};
      var lastActivated = null;
      var onExpMatches = tAttrs.uibIsClass.match(ON_REGEXP);
      var onExp = onExpMatches[2];
      var expsStr = onExpMatches[1];
      var exps = expsStr.split(',');

      return linkFn;

      function linkFn(scope, element, attrs) {
        linkedScopes.push(scope);
        instances.push({
          scope: scope,
          element: element
        });

        exps.forEach(function(exp, k) {
          addForExp(exp, scope);
        });

        scope.$on('$destroy', removeScope);
      }

      function addForExp(exp, scope) {
        var matches = exp.match(IS_REGEXP);
        var clazz = scope.$eval(matches[1]);
        var compareWithExp = matches[2];
        var data = expToData[exp];
        if (!data) {
          var watchFn = function(compareWithVal) {
            var newActivated = null;
            instances.some(function(instance) {
              var thisVal = instance.scope.$eval(onExp);
              if (thisVal === compareWithVal) {
                newActivated = instance;
                return true;
              }
            });
            if (data.lastActivated !== newActivated) {
              if (data.lastActivated) {
                $animate.removeClass(data.lastActivated.element, clazz);
              }
              if (newActivated) {
                $animate.addClass(newActivated.element, clazz);
              }
              data.lastActivated = newActivated;
            }
          };
          expToData[exp] = data = {
            lastActivated: null,
            scope: scope,
            watchFn: watchFn,
            compareWithExp: compareWithExp,
            watcher: scope.$watch(compareWithExp, watchFn)
          };
        }
        data.watchFn(scope.$eval(compareWithExp));
      }

      function removeScope(e) {
        var removedScope = e.targetScope;
        var index = linkedScopes.indexOf(removedScope);
        linkedScopes.splice(index, 1);
        instances.splice(index, 1);
        if (linkedScopes.length) {
          var newWatchScope = linkedScopes[0];
          angular.forEach(expToData, function(data) {
            if (data.scope === removedScope) {
              data.watcher = newWatchScope.$watch(data.compareWithExp, data.watchFn);
              data.scope = newWatchScope;
            }
          });
        } else {
          expToData = {};
        }
      }
    }
  };
}]);
angular.module('ui.bootstrap.datepicker', ['ui.bootstrap.dateparser', 'ui.bootstrap.isClass'])

.value('$datepickerSuppressError', false)

.value('$datepickerLiteralWarning', true)

.constant('uibDatepickerConfig', {
  datepickerMode: 'day',
  formatDay: 'dd',
  formatMonth: 'MMMM',
  formatYear: 'yyyy',
  formatDayHeader: 'EEE',
  formatDayTitle: 'MMMM yyyy',
  formatMonthTitle: 'yyyy',
  maxDate: null,
  maxMode: 'year',
  minDate: null,
  minMode: 'day',
  ngModelOptions: {},
  shortcutPropagation: false,
  showWeeks: true,
  yearColumns: 5,
  yearRows: 4
})

.controller('UibDatepickerController', ['$scope', '$attrs', '$parse', '$interpolate', '$locale', '$log', 'dateFilter', 'uibDatepickerConfig', '$datepickerLiteralWarning', '$datepickerSuppressError', 'uibDateParser',
  function($scope, $attrs, $parse, $interpolate, $locale, $log, dateFilter, datepickerConfig, $datepickerLiteralWarning, $datepickerSuppressError, dateParser) {
  var self = this,
      ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl;
      ngModelOptions = {},
      watchListeners = [],
      optionsUsed = !!$attrs.datepickerOptions;

  if (!$scope.datepickerOptions) {
    $scope.datepickerOptions = {};
  }

  // Modes chain
  this.modes = ['day', 'month', 'year'];

  [
    'customClass',
    'dateDisabled',
    'datepickerMode',
    'formatDay',
    'formatDayHeader',
    'formatDayTitle',
    'formatMonth',
    'formatMonthTitle',
    'formatYear',
    'maxDate',
    'maxMode',
    'minDate',
    'minMode',
    'showWeeks',
    'shortcutPropagation',
    'startingDay',
    'yearColumns',
    'yearRows'
  ].forEach(function(key) {
    switch (key) {
      case 'customClass':
      case 'dateDisabled':
        $scope[key] = $scope.datepickerOptions[key] || angular.noop;
        break;
      case 'datepickerMode':
        $scope.datepickerMode = angular.isDefined($scope.datepickerOptions.datepickerMode) ?
          $scope.datepickerOptions.datepickerMode : datepickerConfig.datepickerMode;
        break;
      case 'formatDay':
      case 'formatDayHeader':
      case 'formatDayTitle':
      case 'formatMonth':
      case 'formatMonthTitle':
      case 'formatYear':
        self[key] = angular.isDefined($scope.datepickerOptions[key]) ?
          $interpolate($scope.datepickerOptions[key])($scope.$parent) :
          datepickerConfig[key];
        break;
      case 'showWeeks':
      case 'shortcutPropagation':
      case 'yearColumns':
      case 'yearRows':
        self[key] = angular.isDefined($scope.datepickerOptions[key]) ?
          $scope.datepickerOptions[key] : datepickerConfig[key];
        break;
      case 'startingDay':
        if (angular.isDefined($scope.datepickerOptions.startingDay)) {
          self.startingDay = $scope.datepickerOptions.startingDay;
        } else if (angular.isNumber(datepickerConfig.startingDay)) {
          self.startingDay = datepickerConfig.startingDay;
        } else {
          self.startingDay = ($locale.DATETIME_FORMATS.FIRSTDAYOFWEEK + 8) % 7;
        }

        break;
      case 'maxDate':
      case 'minDate':
        $scope.$watch('datepickerOptions.' + key, function(value) {
          if (value) {
            if (angular.isDate(value)) {
              self[key] = dateParser.fromTimezone(new Date(value), ngModelOptions.timezone);
            } else {
              if ($datepickerLiteralWarning) {
                $log.warn('Literal date support has been deprecated, please switch to date object usage');
              }

              self[key] = new Date(dateFilter(value, 'medium'));
            }
          } else {
            self[key] = datepickerConfig[key] ?
              dateParser.fromTimezone(new Date(datepickerConfig[key]), ngModelOptions.timezone) :
              null;
          }

          self.refreshView();
        });

        break;
      case 'maxMode':
      case 'minMode':
        if ($scope.datepickerOptions[key]) {
          $scope.$watch(function() { return $scope.datepickerOptions[key]; }, function(value) {
            self[key] = $scope[key] = angular.isDefined(value) ? value : datepickerOptions[key];
            if (key === 'minMode' && self.modes.indexOf($scope.datepickerOptions.datepickerMode) < self.modes.indexOf(self[key]) ||
              key === 'maxMode' && self.modes.indexOf($scope.datepickerOptions.datepickerMode) > self.modes.indexOf(self[key])) {
              $scope.datepickerMode = self[key];
              $scope.datepickerOptions.datepickerMode = self[key];
            }
          });
        } else {
          self[key] = $scope[key] = datepickerConfig[key] || null;
        }

        break;
    }
  });

  $scope.uniqueId = 'datepicker-' + $scope.$id + '-' + Math.floor(Math.random() * 10000);

  $scope.disabled = angular.isDefined($attrs.disabled) || false;
  if (angular.isDefined($attrs.ngDisabled)) {
    watchListeners.push($scope.$parent.$watch($attrs.ngDisabled, function(disabled) {
      $scope.disabled = disabled;
      self.refreshView();
    }));
  }

  $scope.isActive = function(dateObject) {
    if (self.compare(dateObject.date, self.activeDate) === 0) {
      $scope.activeDateId = dateObject.uid;
      return true;
    }
    return false;
  };

  this.init = function(ngModelCtrl_) {
    ngModelCtrl = ngModelCtrl_;
    ngModelOptions = ngModelCtrl_.$options || datepickerConfig.ngModelOptions;
    if ($scope.datepickerOptions.initDate) {
      self.activeDate = dateParser.fromTimezone($scope.datepickerOptions.initDate, ngModelOptions.timezone) || new Date();
      $scope.$watch('datepickerOptions.initDate', function(initDate) {
        if (initDate && (ngModelCtrl.$isEmpty(ngModelCtrl.$modelValue) || ngModelCtrl.$invalid)) {
          self.activeDate = dateParser.fromTimezone(initDate, ngModelOptions.timezone);
          self.refreshView();
        }
      });
    } else {
      self.activeDate = new Date();
    }

    this.activeDate = ngModelCtrl.$modelValue ?
      dateParser.fromTimezone(new Date(ngModelCtrl.$modelValue), ngModelOptions.timezone) :
      dateParser.fromTimezone(new Date(), ngModelOptions.timezone);

    ngModelCtrl.$render = function() {
      self.render();
    };
  };

  this.render = function() {
    if (ngModelCtrl.$viewValue) {
      var date = new Date(ngModelCtrl.$viewValue),
          isValid = !isNaN(date);

      if (isValid) {
        this.activeDate = dateParser.fromTimezone(date, ngModelOptions.timezone);
      } else if (!$datepickerSuppressError) {
        $log.error('Datepicker directive: "ng-model" value must be a Date object');
      }
    }
    this.refreshView();
  };

  this.refreshView = function() {
    if (this.element) {
      $scope.selectedDt = null;
      this._refreshView();
      if ($scope.activeDt) {
        $scope.activeDateId = $scope.activeDt.uid;
      }

      var date = ngModelCtrl.$viewValue ? new Date(ngModelCtrl.$viewValue) : null;
      date = dateParser.fromTimezone(date, ngModelOptions.timezone);
      ngModelCtrl.$setValidity('dateDisabled', !date ||
        this.element && !this.isDisabled(date));
    }
  };

  this.createDateObject = function(date, format) {
    var model = ngModelCtrl.$viewValue ? new Date(ngModelCtrl.$viewValue) : null;
    model = dateParser.fromTimezone(model, ngModelOptions.timezone);
    var today = new Date();
    today = dateParser.fromTimezone(today, ngModelOptions.timezone);
    var time = this.compare(date, today);
    var dt = {
      date: date,
      label: dateParser.filter(date, format),
      selected: model && this.compare(date, model) === 0,
      disabled: this.isDisabled(date),
      past: time < 0,
      current: time === 0,
      future: time > 0,
      customClass: this.customClass(date) || null
    };

    if (model && this.compare(date, model) === 0) {
      $scope.selectedDt = dt;
    }

    if (self.activeDate && this.compare(dt.date, self.activeDate) === 0) {
      $scope.activeDt = dt;
    }

    return dt;
  };

  this.isDisabled = function(date) {
    return $scope.disabled ||
      this.minDate && this.compare(date, this.minDate) < 0 ||
      this.maxDate && this.compare(date, this.maxDate) > 0 ||
      $scope.dateDisabled && $scope.dateDisabled({date: date, mode: $scope.datepickerMode});
  };

  this.customClass = function(date) {
    return $scope.customClass({date: date, mode: $scope.datepickerMode});
  };

  // Split array into smaller arrays
  this.split = function(arr, size) {
    var arrays = [];
    while (arr.length > 0) {
      arrays.push(arr.splice(0, size));
    }
    return arrays;
  };

  $scope.select = function(date) {
    if ($scope.datepickerMode === self.minMode) {
      var dt = ngModelCtrl.$viewValue ? dateParser.fromTimezone(new Date(ngModelCtrl.$viewValue), ngModelOptions.timezone) : new Date(0, 0, 0, 0, 0, 0, 0);
      dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      dt = dateParser.toTimezone(dt, ngModelOptions.timezone);
      ngModelCtrl.$setViewValue(dt);
      ngModelCtrl.$render();
    } else {
      self.activeDate = date;
      setMode(self.modes[self.modes.indexOf($scope.datepickerMode) - 1]);

      $scope.$emit('uib:datepicker.mode');
    }

    $scope.$broadcast('uib:datepicker.focus');
  };

  $scope.move = function(direction) {
    var year = self.activeDate.getFullYear() + direction * (self.step.years || 0),
        month = self.activeDate.getMonth() + direction * (self.step.months || 0);
    self.activeDate.setFullYear(year, month, 1);
    self.refreshView();
  };

  $scope.toggleMode = function(direction) {
    direction = direction || 1;

    if ($scope.datepickerMode === self.maxMode && direction === 1 ||
      $scope.datepickerMode === self.minMode && direction === -1) {
      return;
    }

    setMode(self.modes[self.modes.indexOf($scope.datepickerMode) + direction]);

    $scope.$emit('uib:datepicker.mode');
  };

  // Key event mapper
  $scope.keys = { 13: 'enter', 32: 'space', 33: 'pageup', 34: 'pagedown', 35: 'end', 36: 'home', 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

  var focusElement = function() {
    self.element[0].focus();
  };

  // Listen for focus requests from popup directive
  $scope.$on('uib:datepicker.focus', focusElement);

  $scope.keydown = function(evt) {
    var key = $scope.keys[evt.which];

    if (!key || evt.shiftKey || evt.altKey || $scope.disabled) {
      return;
    }

    evt.preventDefault();
    if (!self.shortcutPropagation) {
      evt.stopPropagation();
    }

    if (key === 'enter' || key === 'space') {
      if (self.isDisabled(self.activeDate)) {
        return; // do nothing
      }
      $scope.select(self.activeDate);
    } else if (evt.ctrlKey && (key === 'up' || key === 'down')) {
      $scope.toggleMode(key === 'up' ? 1 : -1);
    } else {
      self.handleKeyDown(key, evt);
      self.refreshView();
    }
  };

  $scope.$on('$destroy', function() {
    //Clear all watch listeners on destroy
    while (watchListeners.length) {
      watchListeners.shift()();
    }
  });

  function setMode(mode) {
    $scope.datepickerMode = mode;
    $scope.datepickerOptions.datepickerMode = mode;
  }
}])

.controller('UibDaypickerController', ['$scope', '$element', 'dateFilter', function(scope, $element, dateFilter) {
  var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  this.step = { months: 1 };
  this.element = $element;
  function getDaysInMonth(year, month) {
    return month === 1 && year % 4 === 0 &&
      (year % 100 !== 0 || year % 400 === 0) ? 29 : DAYS_IN_MONTH[month];
  }

  this.init = function(ctrl) {
    angular.extend(ctrl, this);
    scope.showWeeks = ctrl.showWeeks;
    ctrl.refreshView();
  };

  this.getDates = function(startDate, n) {
    var dates = new Array(n), current = new Date(startDate), i = 0, date;
    while (i < n) {
      date = new Date(current);
      dates[i++] = date;
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  this._refreshView = function() {
    var year = this.activeDate.getFullYear(),
      month = this.activeDate.getMonth(),
      firstDayOfMonth = new Date(this.activeDate);

    firstDayOfMonth.setFullYear(year, month, 1);

    var difference = this.startingDay - firstDayOfMonth.getDay(),
      numDisplayedFromPreviousMonth = difference > 0 ?
        7 - difference : - difference,
      firstDate = new Date(firstDayOfMonth);

    if (numDisplayedFromPreviousMonth > 0) {
      firstDate.setDate(-numDisplayedFromPreviousMonth + 1);
    }

    // 42 is the number of days on a six-week calendar
    var days = this.getDates(firstDate, 42);
    for (var i = 0; i < 42; i ++) {
      days[i] = angular.extend(this.createDateObject(days[i], this.formatDay), {
        secondary: days[i].getMonth() !== month,
        uid: scope.uniqueId + '-' + i
      });
    }

    scope.labels = new Array(7);
    for (var j = 0; j < 7; j++) {
      scope.labels[j] = {
        abbr: dateFilter(days[j].date, this.formatDayHeader),
        full: dateFilter(days[j].date, 'EEEE')
      };
    }

    scope.title = dateFilter(this.activeDate, this.formatDayTitle);
    scope.rows = this.split(days, 7);

    if (scope.showWeeks) {
      scope.weekNumbers = [];
      var thursdayIndex = (4 + 7 - this.startingDay) % 7,
          numWeeks = scope.rows.length;
      for (var curWeek = 0; curWeek < numWeeks; curWeek++) {
        scope.weekNumbers.push(
          getISO8601WeekNumber(scope.rows[curWeek][thursdayIndex].date));
      }
    }
  };

  this.compare = function(date1, date2) {
    var _date1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    var _date2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    _date1.setFullYear(date1.getFullYear());
    _date2.setFullYear(date2.getFullYear());
    return _date1 - _date2;
  };

  function getISO8601WeekNumber(date) {
    var checkDate = new Date(date);
    checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
    var time = checkDate.getTime();
    checkDate.setMonth(0); // Compare with Jan 1
    checkDate.setDate(1);
    return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
  }

  this.handleKeyDown = function(key, evt) {
    var date = this.activeDate.getDate();

    if (key === 'left') {
      date = date - 1;
    } else if (key === 'up') {
      date = date - 7;
    } else if (key === 'right') {
      date = date + 1;
    } else if (key === 'down') {
      date = date + 7;
    } else if (key === 'pageup' || key === 'pagedown') {
      var month = this.activeDate.getMonth() + (key === 'pageup' ? - 1 : 1);
      this.activeDate.setMonth(month, 1);
      date = Math.min(getDaysInMonth(this.activeDate.getFullYear(), this.activeDate.getMonth()), date);
    } else if (key === 'home') {
      date = 1;
    } else if (key === 'end') {
      date = getDaysInMonth(this.activeDate.getFullYear(), this.activeDate.getMonth());
    }
    this.activeDate.setDate(date);
  };
}])

.controller('UibMonthpickerController', ['$scope', '$element', 'dateFilter', function(scope, $element, dateFilter) {
  this.step = { years: 1 };
  this.element = $element;

  this.init = function(ctrl) {
    angular.extend(ctrl, this);
    ctrl.refreshView();
  };

  this._refreshView = function() {
    var months = new Array(12),
        year = this.activeDate.getFullYear(),
        date;

    for (var i = 0; i < 12; i++) {
      date = new Date(this.activeDate);
      date.setFullYear(year, i, 1);
      months[i] = angular.extend(this.createDateObject(date, this.formatMonth), {
        uid: scope.uniqueId + '-' + i
      });
    }

    scope.title = dateFilter(this.activeDate, this.formatMonthTitle);
    scope.rows = this.split(months, 3);
  };

  this.compare = function(date1, date2) {
    var _date1 = new Date(date1.getFullYear(), date1.getMonth());
    var _date2 = new Date(date2.getFullYear(), date2.getMonth());
    _date1.setFullYear(date1.getFullYear());
    _date2.setFullYear(date2.getFullYear());
    return _date1 - _date2;
  };

  this.handleKeyDown = function(key, evt) {
    var date = this.activeDate.getMonth();

    if (key === 'left') {
      date = date - 1;
    } else if (key === 'up') {
      date = date - 3;
    } else if (key === 'right') {
      date = date + 1;
    } else if (key === 'down') {
      date = date + 3;
    } else if (key === 'pageup' || key === 'pagedown') {
      var year = this.activeDate.getFullYear() + (key === 'pageup' ? - 1 : 1);
      this.activeDate.setFullYear(year);
    } else if (key === 'home') {
      date = 0;
    } else if (key === 'end') {
      date = 11;
    }
    this.activeDate.setMonth(date);
  };
}])

.controller('UibYearpickerController', ['$scope', '$element', 'dateFilter', function(scope, $element, dateFilter) {
  var columns, range;
  this.element = $element;

  function getStartingYear(year) {
    return parseInt((year - 1) / range, 10) * range + 1;
  }

  this.yearpickerInit = function() {
    columns = this.yearColumns;
    range = this.yearRows * columns;
    this.step = { years: range };
  };

  this._refreshView = function() {
    var years = new Array(range), date;

    for (var i = 0, start = getStartingYear(this.activeDate.getFullYear()); i < range; i++) {
      date = new Date(this.activeDate);
      date.setFullYear(start + i, 0, 1);
      years[i] = angular.extend(this.createDateObject(date, this.formatYear), {
        uid: scope.uniqueId + '-' + i
      });
    }

    scope.title = [years[0].label, years[range - 1].label].join(' - ');
    scope.rows = this.split(years, columns);
    scope.columns = columns;
  };

  this.compare = function(date1, date2) {
    return date1.getFullYear() - date2.getFullYear();
  };

  this.handleKeyDown = function(key, evt) {
    var date = this.activeDate.getFullYear();

    if (key === 'left') {
      date = date - 1;
    } else if (key === 'up') {
      date = date - columns;
    } else if (key === 'right') {
      date = date + 1;
    } else if (key === 'down') {
      date = date + columns;
    } else if (key === 'pageup' || key === 'pagedown') {
      date += (key === 'pageup' ? - 1 : 1) * range;
    } else if (key === 'home') {
      date = getStartingYear(this.activeDate.getFullYear());
    } else if (key === 'end') {
      date = getStartingYear(this.activeDate.getFullYear()) + range - 1;
    }
    this.activeDate.setFullYear(date);
  };
}])

.directive('uibDatepicker', function() {
  return {
    replace: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepicker/datepicker.html';
    },
    scope: {
      datepickerOptions: '=?'
    },
    require: ['uibDatepicker', '^ngModel'],
    controller: 'UibDatepickerController',
    controllerAs: 'datepicker',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      datepickerCtrl.init(ngModelCtrl);
    }
  };
})

.directive('uibDaypicker', function() {
  return {
    replace: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepicker/day.html';
    },
    require: ['^uibDatepicker', 'uibDaypicker'],
    controller: 'UibDaypickerController',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0],
        daypickerCtrl = ctrls[1];

      daypickerCtrl.init(datepickerCtrl);
    }
  };
})

.directive('uibMonthpicker', function() {
  return {
    replace: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepicker/month.html';
    },
    require: ['^uibDatepicker', 'uibMonthpicker'],
    controller: 'UibMonthpickerController',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0],
        monthpickerCtrl = ctrls[1];

      monthpickerCtrl.init(datepickerCtrl);
    }
  };
})

.directive('uibYearpicker', function() {
  return {
    replace: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepicker/year.html';
    },
    require: ['^uibDatepicker', 'uibYearpicker'],
    controller: 'UibYearpickerController',
    link: function(scope, element, attrs, ctrls) {
      var ctrl = ctrls[0];
      angular.extend(ctrl, ctrls[1]);
      ctrl.yearpickerInit();

      ctrl.refreshView();
    }
  };
});

angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods for working with the DOM.
 * It is meant to be used where we need to absolute-position elements in
 * relation to another element (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
  .factory('$uibPosition', ['$document', '$window', function($document, $window) {
    /**
     * Used by scrollbarWidth() function to cache scrollbar's width.
     * Do not access this variable directly, use scrollbarWidth() instead.
     */
    var SCROLLBAR_WIDTH;
    /**
     * scrollbar on body and html element in IE and Edge overlay
     * content and should be considered 0 width.
     */
    var BODY_SCROLLBAR_WIDTH;
    var OVERFLOW_REGEX = {
      normal: /(auto|scroll)/,
      hidden: /(auto|scroll|hidden)/
    };
    var PLACEMENT_REGEX = {
      auto: /\s?auto?\s?/i,
      primary: /^(top|bottom|left|right)$/,
      secondary: /^(top|bottom|left|right|center)$/,
      vertical: /^(top|bottom)$/
    };
    var BODY_REGEX = /(HTML|BODY)/;

    return {

      /**
       * Provides a raw DOM element from a jQuery/jQLite element.
       *
       * @param {element} elem - The element to convert.
       *
       * @returns {element} A HTML element.
       */
      getRawNode: function(elem) {
        return elem.nodeName ? elem : elem[0] || elem;
      },

      /**
       * Provides a parsed number for a style property.  Strips
       * units and casts invalid numbers to 0.
       *
       * @param {string} value - The style value to parse.
       *
       * @returns {number} A valid number.
       */
      parseStyle: function(value) {
        value = parseFloat(value);
        return isFinite(value) ? value : 0;
      },

      /**
       * Provides the closest positioned ancestor.
       *
       * @param {element} element - The element to get the offest parent for.
       *
       * @returns {element} The closest positioned ancestor.
       */
      offsetParent: function(elem) {
        elem = this.getRawNode(elem);

        var offsetParent = elem.offsetParent || $document[0].documentElement;

        function isStaticPositioned(el) {
          return ($window.getComputedStyle(el).position || 'static') === 'static';
        }

        while (offsetParent && offsetParent !== $document[0].documentElement && isStaticPositioned(offsetParent)) {
          offsetParent = offsetParent.offsetParent;
        }

        return offsetParent || $document[0].documentElement;
      },

      /**
       * Provides the scrollbar width, concept from TWBS measureScrollbar()
       * function in https://github.com/twbs/bootstrap/blob/master/js/modal.js
       * In IE and Edge, scollbar on body and html element overlay and should
       * return a width of 0.
       *
       * @returns {number} The width of the browser scollbar.
       */
      scrollbarWidth: function(isBody) {
        if (isBody) {
          if (angular.isUndefined(BODY_SCROLLBAR_WIDTH)) {
            var bodyElem = $document.find('body');
            bodyElem.addClass('uib-position-body-scrollbar-measure');
            BODY_SCROLLBAR_WIDTH = $window.innerWidth - bodyElem[0].clientWidth;
            BODY_SCROLLBAR_WIDTH = isFinite(BODY_SCROLLBAR_WIDTH) ? BODY_SCROLLBAR_WIDTH : 0;
            bodyElem.removeClass('uib-position-body-scrollbar-measure');
          }
          return BODY_SCROLLBAR_WIDTH;
        }

        if (angular.isUndefined(SCROLLBAR_WIDTH)) {
          var scrollElem = angular.element('<div class="uib-position-scrollbar-measure"></div>');
          $document.find('body').append(scrollElem);
          SCROLLBAR_WIDTH = scrollElem[0].offsetWidth - scrollElem[0].clientWidth;
          SCROLLBAR_WIDTH = isFinite(SCROLLBAR_WIDTH) ? SCROLLBAR_WIDTH : 0;
          scrollElem.remove();
        }

        return SCROLLBAR_WIDTH;
      },

      /**
       * Provides the padding required on an element to replace the scrollbar.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**scrollbarWidth**: the width of the scrollbar</li>
       *     <li>**widthOverflow**: whether the the width is overflowing</li>
       *     <li>**right**: the amount of right padding on the element needed to replace the scrollbar</li>
       *     <li>**rightOriginal**: the amount of right padding currently on the element</li>
       *     <li>**heightOverflow**: whether the the height is overflowing</li>
       *     <li>**bottom**: the amount of bottom padding on the element needed to replace the scrollbar</li>
       *     <li>**bottomOriginal**: the amount of bottom padding currently on the element</li>
       *   </ul>
       */
      scrollbarPadding: function(elem) {
        elem = this.getRawNode(elem);

        var elemStyle = $window.getComputedStyle(elem);
        var paddingRight = this.parseStyle(elemStyle.paddingRight);
        var paddingBottom = this.parseStyle(elemStyle.paddingBottom);
        var scrollParent = this.scrollParent(elem, false, true);
        var scrollbarWidth = this.scrollbarWidth(scrollParent, BODY_REGEX.test(scrollParent.tagName));

        return {
          scrollbarWidth: scrollbarWidth,
          widthOverflow: scrollParent.scrollWidth > scrollParent.clientWidth,
          right: paddingRight + scrollbarWidth,
          originalRight: paddingRight,
          heightOverflow: scrollParent.scrollHeight > scrollParent.clientHeight,
          bottom: paddingBottom + scrollbarWidth,
          originalBottom: paddingBottom
         };
      },

      /**
       * Checks to see if the element is scrollable.
       *
       * @param {element} elem - The element to check.
       * @param {boolean=} [includeHidden=false] - Should scroll style of 'hidden' be considered,
       *   default is false.
       *
       * @returns {boolean} Whether the element is scrollable.
       */
      isScrollable: function(elem, includeHidden) {
        elem = this.getRawNode(elem);

        var overflowRegex = includeHidden ? OVERFLOW_REGEX.hidden : OVERFLOW_REGEX.normal;
        var elemStyle = $window.getComputedStyle(elem);
        return overflowRegex.test(elemStyle.overflow + elemStyle.overflowY + elemStyle.overflowX);
      },

      /**
       * Provides the closest scrollable ancestor.
       * A port of the jQuery UI scrollParent method:
       * https://github.com/jquery/jquery-ui/blob/master/ui/scroll-parent.js
       *
       * @param {element} elem - The element to find the scroll parent of.
       * @param {boolean=} [includeHidden=false] - Should scroll style of 'hidden' be considered,
       *   default is false.
       * @param {boolean=} [includeSelf=false] - Should the element being passed be
       * included in the scrollable llokup.
       *
       * @returns {element} A HTML element.
       */
      scrollParent: function(elem, includeHidden, includeSelf) {
        elem = this.getRawNode(elem);

        var overflowRegex = includeHidden ? OVERFLOW_REGEX.hidden : OVERFLOW_REGEX.normal;
        var documentEl = $document[0].documentElement;
        var elemStyle = $window.getComputedStyle(elem);
        if (includeSelf && overflowRegex.test(elemStyle.overflow + elemStyle.overflowY + elemStyle.overflowX)) {
          return elem;
        }
        var excludeStatic = elemStyle.position === 'absolute';
        var scrollParent = elem.parentElement || documentEl;

        if (scrollParent === documentEl || elemStyle.position === 'fixed') {
          return documentEl;
        }

        while (scrollParent.parentElement && scrollParent !== documentEl) {
          var spStyle = $window.getComputedStyle(scrollParent);
          if (excludeStatic && spStyle.position !== 'static') {
            excludeStatic = false;
          }

          if (!excludeStatic && overflowRegex.test(spStyle.overflow + spStyle.overflowY + spStyle.overflowX)) {
            break;
          }
          scrollParent = scrollParent.parentElement;
        }

        return scrollParent;
      },

      /**
       * Provides read-only equivalent of jQuery's position function:
       * http://api.jquery.com/position/ - distance to closest positioned
       * ancestor.  Does not account for margins by default like jQuery position.
       *
       * @param {element} elem - The element to caclulate the position on.
       * @param {boolean=} [includeMargins=false] - Should margins be accounted
       * for, default is false.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**width**: the width of the element</li>
       *     <li>**height**: the height of the element</li>
       *     <li>**top**: distance to top edge of offset parent</li>
       *     <li>**left**: distance to left edge of offset parent</li>
       *   </ul>
       */
      position: function(elem, includeMagins) {
        elem = this.getRawNode(elem);

        var elemOffset = this.offset(elem);
        if (includeMagins) {
          var elemStyle = $window.getComputedStyle(elem);
          elemOffset.top -= this.parseStyle(elemStyle.marginTop);
          elemOffset.left -= this.parseStyle(elemStyle.marginLeft);
        }
        var parent = this.offsetParent(elem);
        var parentOffset = {top: 0, left: 0};

        if (parent !== $document[0].documentElement) {
          parentOffset = this.offset(parent);
          parentOffset.top += parent.clientTop - parent.scrollTop;
          parentOffset.left += parent.clientLeft - parent.scrollLeft;
        }

        return {
          width: Math.round(angular.isNumber(elemOffset.width) ? elemOffset.width : elem.offsetWidth),
          height: Math.round(angular.isNumber(elemOffset.height) ? elemOffset.height : elem.offsetHeight),
          top: Math.round(elemOffset.top - parentOffset.top),
          left: Math.round(elemOffset.left - parentOffset.left)
        };
      },

      /**
       * Provides read-only equivalent of jQuery's offset function:
       * http://api.jquery.com/offset/ - distance to viewport.  Does
       * not account for borders, margins, or padding on the body
       * element.
       *
       * @param {element} elem - The element to calculate the offset on.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**width**: the width of the element</li>
       *     <li>**height**: the height of the element</li>
       *     <li>**top**: distance to top edge of viewport</li>
       *     <li>**right**: distance to bottom edge of viewport</li>
       *   </ul>
       */
      offset: function(elem) {
        elem = this.getRawNode(elem);

        var elemBCR = elem.getBoundingClientRect();
        return {
          width: Math.round(angular.isNumber(elemBCR.width) ? elemBCR.width : elem.offsetWidth),
          height: Math.round(angular.isNumber(elemBCR.height) ? elemBCR.height : elem.offsetHeight),
          top: Math.round(elemBCR.top + ($window.pageYOffset || $document[0].documentElement.scrollTop)),
          left: Math.round(elemBCR.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft))
        };
      },

      /**
       * Provides offset distance to the closest scrollable ancestor
       * or viewport.  Accounts for border and scrollbar width.
       *
       * Right and bottom dimensions represent the distance to the
       * respective edge of the viewport element.  If the element
       * edge extends beyond the viewport, a negative value will be
       * reported.
       *
       * @param {element} elem - The element to get the viewport offset for.
       * @param {boolean=} [useDocument=false] - Should the viewport be the document element instead
       * of the first scrollable element, default is false.
       * @param {boolean=} [includePadding=true] - Should the padding on the offset parent element
       * be accounted for, default is true.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**top**: distance to the top content edge of viewport element</li>
       *     <li>**bottom**: distance to the bottom content edge of viewport element</li>
       *     <li>**left**: distance to the left content edge of viewport element</li>
       *     <li>**right**: distance to the right content edge of viewport element</li>
       *   </ul>
       */
      viewportOffset: function(elem, useDocument, includePadding) {
        elem = this.getRawNode(elem);
        includePadding = includePadding !== false ? true : false;

        var elemBCR = elem.getBoundingClientRect();
        var offsetBCR = {top: 0, left: 0, bottom: 0, right: 0};

        var offsetParent = useDocument ? $document[0].documentElement : this.scrollParent(elem);
        var offsetParentBCR = offsetParent.getBoundingClientRect();

        offsetBCR.top = offsetParentBCR.top + offsetParent.clientTop;
        offsetBCR.left = offsetParentBCR.left + offsetParent.clientLeft;
        if (offsetParent === $document[0].documentElement) {
          offsetBCR.top += $window.pageYOffset;
          offsetBCR.left += $window.pageXOffset;
        }
        offsetBCR.bottom = offsetBCR.top + offsetParent.clientHeight;
        offsetBCR.right = offsetBCR.left + offsetParent.clientWidth;

        if (includePadding) {
          var offsetParentStyle = $window.getComputedStyle(offsetParent);
          offsetBCR.top += this.parseStyle(offsetParentStyle.paddingTop);
          offsetBCR.bottom -= this.parseStyle(offsetParentStyle.paddingBottom);
          offsetBCR.left += this.parseStyle(offsetParentStyle.paddingLeft);
          offsetBCR.right -= this.parseStyle(offsetParentStyle.paddingRight);
        }

        return {
          top: Math.round(elemBCR.top - offsetBCR.top),
          bottom: Math.round(offsetBCR.bottom - elemBCR.bottom),
          left: Math.round(elemBCR.left - offsetBCR.left),
          right: Math.round(offsetBCR.right - elemBCR.right)
        };
      },

      /**
       * Provides an array of placement values parsed from a placement string.
       * Along with the 'auto' indicator, supported placement strings are:
       *   <ul>
       *     <li>top: element on top, horizontally centered on host element.</li>
       *     <li>top-left: element on top, left edge aligned with host element left edge.</li>
       *     <li>top-right: element on top, lerightft edge aligned with host element right edge.</li>
       *     <li>bottom: element on bottom, horizontally centered on host element.</li>
       *     <li>bottom-left: element on bottom, left edge aligned with host element left edge.</li>
       *     <li>bottom-right: element on bottom, right edge aligned with host element right edge.</li>
       *     <li>left: element on left, vertically centered on host element.</li>
       *     <li>left-top: element on left, top edge aligned with host element top edge.</li>
       *     <li>left-bottom: element on left, bottom edge aligned with host element bottom edge.</li>
       *     <li>right: element on right, vertically centered on host element.</li>
       *     <li>right-top: element on right, top edge aligned with host element top edge.</li>
       *     <li>right-bottom: element on right, bottom edge aligned with host element bottom edge.</li>
       *   </ul>
       * A placement string with an 'auto' indicator is expected to be
       * space separated from the placement, i.e: 'auto bottom-left'  If
       * the primary and secondary placement values do not match 'top,
       * bottom, left, right' then 'top' will be the primary placement and
       * 'center' will be the secondary placement.  If 'auto' is passed, true
       * will be returned as the 3rd value of the array.
       *
       * @param {string} placement - The placement string to parse.
       *
       * @returns {array} An array with the following values
       * <ul>
       *   <li>**[0]**: The primary placement.</li>
       *   <li>**[1]**: The secondary placement.</li>
       *   <li>**[2]**: If auto is passed: true, else undefined.</li>
       * </ul>
       */
      parsePlacement: function(placement) {
        var autoPlace = PLACEMENT_REGEX.auto.test(placement);
        if (autoPlace) {
          placement = placement.replace(PLACEMENT_REGEX.auto, '');
        }

        placement = placement.split('-');

        placement[0] = placement[0] || 'top';
        if (!PLACEMENT_REGEX.primary.test(placement[0])) {
          placement[0] = 'top';
        }

        placement[1] = placement[1] || 'center';
        if (!PLACEMENT_REGEX.secondary.test(placement[1])) {
          placement[1] = 'center';
        }

        if (autoPlace) {
          placement[2] = true;
        } else {
          placement[2] = false;
        }

        return placement;
      },

      /**
       * Provides coordinates for an element to be positioned relative to
       * another element.  Passing 'auto' as part of the placement parameter
       * will enable smart placement - where the element fits. i.e:
       * 'auto left-top' will check to see if there is enough space to the left
       * of the hostElem to fit the targetElem, if not place right (same for secondary
       * top placement).  Available space is calculated using the viewportOffset
       * function.
       *
       * @param {element} hostElem - The element to position against.
       * @param {element} targetElem - The element to position.
       * @param {string=} [placement=top] - The placement for the targetElem,
       *   default is 'top'. 'center' is assumed as secondary placement for
       *   'top', 'left', 'right', and 'bottom' placements.  Available placements are:
       *   <ul>
       *     <li>top</li>
       *     <li>top-right</li>
       *     <li>top-left</li>
       *     <li>bottom</li>
       *     <li>bottom-left</li>
       *     <li>bottom-right</li>
       *     <li>left</li>
       *     <li>left-top</li>
       *     <li>left-bottom</li>
       *     <li>right</li>
       *     <li>right-top</li>
       *     <li>right-bottom</li>
       *   </ul>
       * @param {boolean=} [appendToBody=false] - Should the top and left values returned
       *   be calculated from the body element, default is false.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**top**: Value for targetElem top.</li>
       *     <li>**left**: Value for targetElem left.</li>
       *     <li>**placement**: The resolved placement.</li>
       *   </ul>
       */
      positionElements: function(hostElem, targetElem, placement, appendToBody) {
        hostElem = this.getRawNode(hostElem);
        targetElem = this.getRawNode(targetElem);

        // need to read from prop to support tests.
        var targetWidth = angular.isDefined(targetElem.offsetWidth) ? targetElem.offsetWidth : targetElem.prop('offsetWidth');
        var targetHeight = angular.isDefined(targetElem.offsetHeight) ? targetElem.offsetHeight : targetElem.prop('offsetHeight');

        placement = this.parsePlacement(placement);

        var hostElemPos = appendToBody ? this.offset(hostElem) : this.position(hostElem);
        var targetElemPos = {top: 0, left: 0, placement: ''};

        if (placement[2]) {
          var viewportOffset = this.viewportOffset(hostElem, appendToBody);

          var targetElemStyle = $window.getComputedStyle(targetElem);
          var adjustedSize = {
            width: targetWidth + Math.round(Math.abs(this.parseStyle(targetElemStyle.marginLeft) + this.parseStyle(targetElemStyle.marginRight))),
            height: targetHeight + Math.round(Math.abs(this.parseStyle(targetElemStyle.marginTop) + this.parseStyle(targetElemStyle.marginBottom)))
          };

          placement[0] = placement[0] === 'top' && adjustedSize.height > viewportOffset.top && adjustedSize.height <= viewportOffset.bottom ? 'bottom' :
                         placement[0] === 'bottom' && adjustedSize.height > viewportOffset.bottom && adjustedSize.height <= viewportOffset.top ? 'top' :
                         placement[0] === 'left' && adjustedSize.width > viewportOffset.left && adjustedSize.width <= viewportOffset.right ? 'right' :
                         placement[0] === 'right' && adjustedSize.width > viewportOffset.right && adjustedSize.width <= viewportOffset.left ? 'left' :
                         placement[0];

          placement[1] = placement[1] === 'top' && adjustedSize.height - hostElemPos.height > viewportOffset.bottom && adjustedSize.height - hostElemPos.height <= viewportOffset.top ? 'bottom' :
                         placement[1] === 'bottom' && adjustedSize.height - hostElemPos.height > viewportOffset.top && adjustedSize.height - hostElemPos.height <= viewportOffset.bottom ? 'top' :
                         placement[1] === 'left' && adjustedSize.width - hostElemPos.width > viewportOffset.right && adjustedSize.width - hostElemPos.width <= viewportOffset.left ? 'right' :
                         placement[1] === 'right' && adjustedSize.width - hostElemPos.width > viewportOffset.left && adjustedSize.width - hostElemPos.width <= viewportOffset.right ? 'left' :
                         placement[1];

          if (placement[1] === 'center') {
            if (PLACEMENT_REGEX.vertical.test(placement[0])) {
              var xOverflow = hostElemPos.width / 2 - targetWidth / 2;
              if (viewportOffset.left + xOverflow < 0 && adjustedSize.width - hostElemPos.width <= viewportOffset.right) {
                placement[1] = 'left';
              } else if (viewportOffset.right + xOverflow < 0 && adjustedSize.width - hostElemPos.width <= viewportOffset.left) {
                placement[1] = 'right';
              }
            } else {
              var yOverflow = hostElemPos.height / 2 - adjustedSize.height / 2;
              if (viewportOffset.top + yOverflow < 0 && adjustedSize.height - hostElemPos.height <= viewportOffset.bottom) {
                placement[1] = 'top';
              } else if (viewportOffset.bottom + yOverflow < 0 && adjustedSize.height - hostElemPos.height <= viewportOffset.top) {
                placement[1] = 'bottom';
              }
            }
          }
        }

        switch (placement[0]) {
          case 'top':
            targetElemPos.top = hostElemPos.top - targetHeight;
            break;
          case 'bottom':
            targetElemPos.top = hostElemPos.top + hostElemPos.height;
            break;
          case 'left':
            targetElemPos.left = hostElemPos.left - targetWidth;
            break;
          case 'right':
            targetElemPos.left = hostElemPos.left + hostElemPos.width;
            break;
        }

        switch (placement[1]) {
          case 'top':
            targetElemPos.top = hostElemPos.top;
            break;
          case 'bottom':
            targetElemPos.top = hostElemPos.top + hostElemPos.height - targetHeight;
            break;
          case 'left':
            targetElemPos.left = hostElemPos.left;
            break;
          case 'right':
            targetElemPos.left = hostElemPos.left + hostElemPos.width - targetWidth;
            break;
          case 'center':
            if (PLACEMENT_REGEX.vertical.test(placement[0])) {
              targetElemPos.left = hostElemPos.left + hostElemPos.width / 2 - targetWidth / 2;
            } else {
              targetElemPos.top = hostElemPos.top + hostElemPos.height / 2 - targetHeight / 2;
            }
            break;
        }

        targetElemPos.top = Math.round(targetElemPos.top);
        targetElemPos.left = Math.round(targetElemPos.left);
        targetElemPos.placement = placement[1] === 'center' ? placement[0] : placement[0] + '-' + placement[1];

        return targetElemPos;
      },

      /**
      * Provides a way for positioning tooltip & dropdown
      * arrows when using placement options beyond the standard
      * left, right, top, or bottom.
      *
      * @param {element} elem - The tooltip/dropdown element.
      * @param {string} placement - The placement for the elem.
      */
      positionArrow: function(elem, placement) {
        elem = this.getRawNode(elem);

        var innerElem = elem.querySelector('.tooltip-inner, .popover-inner');
        if (!innerElem) {
          return;
        }

        var isTooltip = angular.element(innerElem).hasClass('tooltip-inner');

        var arrowElem = isTooltip ? elem.querySelector('.tooltip-arrow') : elem.querySelector('.arrow');
        if (!arrowElem) {
          return;
        }

        var arrowCss = {
          top: '',
          bottom: '',
          left: '',
          right: ''
        };

        placement = this.parsePlacement(placement);
        if (placement[1] === 'center') {
          // no adjustment necessary - just reset styles
          angular.element(arrowElem).css(arrowCss);
          return;
        }

        var borderProp = 'border-' + placement[0] + '-width';
        var borderWidth = $window.getComputedStyle(arrowElem)[borderProp];

        var borderRadiusProp = 'border-';
        if (PLACEMENT_REGEX.vertical.test(placement[0])) {
          borderRadiusProp += placement[0] + '-' + placement[1];
        } else {
          borderRadiusProp += placement[1] + '-' + placement[0];
        }
        borderRadiusProp += '-radius';
        var borderRadius = $window.getComputedStyle(isTooltip ? innerElem : elem)[borderRadiusProp];

        switch (placement[0]) {
          case 'top':
            arrowCss.bottom = isTooltip ? '0' : '-' + borderWidth;
            break;
          case 'bottom':
            arrowCss.top = isTooltip ? '0' : '-' + borderWidth;
            break;
          case 'left':
            arrowCss.right = isTooltip ? '0' : '-' + borderWidth;
            break;
          case 'right':
            arrowCss.left = isTooltip ? '0' : '-' + borderWidth;
            break;
        }

        arrowCss[placement[1]] = borderRadius;

        angular.element(arrowElem).css(arrowCss);
      }
    };
  }]);

angular.module('ui.bootstrap.datepickerPopup', ['ui.bootstrap.datepicker', 'ui.bootstrap.position'])

.value('$datepickerPopupLiteralWarning', true)

.constant('uibDatepickerPopupConfig', {
  altInputFormats: [],
  appendToBody: false,
  clearText: 'Clear',
  closeOnDateSelection: true,
  closeText: 'Done',
  currentText: 'Today',
  datepickerPopup: 'yyyy-MM-dd',
  datepickerPopupTemplateUrl: 'uib/template/datepickerPopup/popup.html',
  datepickerTemplateUrl: 'uib/template/datepicker/datepicker.html',
  html5Types: {
    date: 'yyyy-MM-dd',
    'datetime-local': 'yyyy-MM-ddTHH:mm:ss.sss',
    'month': 'yyyy-MM'
  },
  onOpenFocus: true,
  showButtonBar: true,
  placement: 'auto bottom-left'
})

.controller('UibDatepickerPopupController', ['$scope', '$element', '$attrs', '$compile', '$log', '$parse', '$window', '$document', '$rootScope', '$uibPosition', 'dateFilter', 'uibDateParser', 'uibDatepickerPopupConfig', '$timeout', 'uibDatepickerConfig', '$datepickerPopupLiteralWarning',
function($scope, $element, $attrs, $compile, $log, $parse, $window, $document, $rootScope, $position, dateFilter, dateParser, datepickerPopupConfig, $timeout, datepickerConfig, $datepickerPopupLiteralWarning) {
  var cache = {},
    isHtml5DateInput = false;
  var dateFormat, closeOnDateSelection, appendToBody, onOpenFocus,
    datepickerPopupTemplateUrl, datepickerTemplateUrl, popupEl, datepickerEl, scrollParentEl,
    ngModel, ngModelOptions, $popup, altInputFormats, watchListeners = [],
    timezone;

  this.init = function(_ngModel_) {
    ngModel = _ngModel_;
    ngModelOptions = _ngModel_.$options;
    closeOnDateSelection = angular.isDefined($attrs.closeOnDateSelection) ?
      $scope.$parent.$eval($attrs.closeOnDateSelection) :
      datepickerPopupConfig.closeOnDateSelection;
    appendToBody = angular.isDefined($attrs.datepickerAppendToBody) ?
      $scope.$parent.$eval($attrs.datepickerAppendToBody) :
      datepickerPopupConfig.appendToBody;
    onOpenFocus = angular.isDefined($attrs.onOpenFocus) ?
      $scope.$parent.$eval($attrs.onOpenFocus) : datepickerPopupConfig.onOpenFocus;
    datepickerPopupTemplateUrl = angular.isDefined($attrs.datepickerPopupTemplateUrl) ?
      $attrs.datepickerPopupTemplateUrl :
      datepickerPopupConfig.datepickerPopupTemplateUrl;
    datepickerTemplateUrl = angular.isDefined($attrs.datepickerTemplateUrl) ?
      $attrs.datepickerTemplateUrl : datepickerPopupConfig.datepickerTemplateUrl;
    altInputFormats = angular.isDefined($attrs.altInputFormats) ?
      $scope.$parent.$eval($attrs.altInputFormats) :
      datepickerPopupConfig.altInputFormats;

    $scope.showButtonBar = angular.isDefined($attrs.showButtonBar) ?
      $scope.$parent.$eval($attrs.showButtonBar) :
      datepickerPopupConfig.showButtonBar;

    if (datepickerPopupConfig.html5Types[$attrs.type]) {
      dateFormat = datepickerPopupConfig.html5Types[$attrs.type];
      isHtml5DateInput = true;
    } else {
      dateFormat = $attrs.uibDatepickerPopup || datepickerPopupConfig.datepickerPopup;
      $attrs.$observe('uibDatepickerPopup', function(value, oldValue) {
        var newDateFormat = value || datepickerPopupConfig.datepickerPopup;
        // Invalidate the $modelValue to ensure that formatters re-run
        // FIXME: Refactor when PR is merged: https://github.com/angular/angular.js/pull/10764
        if (newDateFormat !== dateFormat) {
          dateFormat = newDateFormat;
          ngModel.$modelValue = null;

          if (!dateFormat) {
            throw new Error('uibDatepickerPopup must have a date format specified.');
          }
        }
      });
    }

    if (!dateFormat) {
      throw new Error('uibDatepickerPopup must have a date format specified.');
    }

    if (isHtml5DateInput && $attrs.uibDatepickerPopup) {
      throw new Error('HTML5 date input types do not support custom formats.');
    }

    // popup element used to display calendar
    popupEl = angular.element('<div uib-datepicker-popup-wrap><div uib-datepicker></div></div>');
    if (ngModelOptions) {
      timezone = ngModelOptions.timezone;
      $scope.ngModelOptions = angular.copy(ngModelOptions);
      $scope.ngModelOptions.timezone = null;
      if ($scope.ngModelOptions.updateOnDefault === true) {
        $scope.ngModelOptions.updateOn = $scope.ngModelOptions.updateOn ?
          $scope.ngModelOptions.updateOn + ' default' : 'default';
      }

      popupEl.attr('ng-model-options', 'ngModelOptions');
    } else {
      timezone = null;
    }

    popupEl.attr({
      'ng-model': 'date',
      'ng-change': 'dateSelection(date)',
      'template-url': datepickerPopupTemplateUrl
    });

    // datepicker element
    datepickerEl = angular.element(popupEl.children()[0]);
    datepickerEl.attr('template-url', datepickerTemplateUrl);

    if (!$scope.datepickerOptions) {
      $scope.datepickerOptions = {};
    }

    if (isHtml5DateInput) {
      if ($attrs.type === 'month') {
        $scope.datepickerOptions.datepickerMode = 'month';
        $scope.datepickerOptions.minMode = 'month';
      }
    }

    datepickerEl.attr('datepicker-options', 'datepickerOptions');

    if (!isHtml5DateInput) {
      // Internal API to maintain the correct ng-invalid-[key] class
      ngModel.$$parserName = 'date';
      ngModel.$validators.date = validator;
      ngModel.$parsers.unshift(parseDate);
      ngModel.$formatters.push(function(value) {
        if (ngModel.$isEmpty(value)) {
          $scope.date = value;
          return value;
        }

        $scope.date = dateParser.fromTimezone(value, timezone);

        if (angular.isNumber($scope.date)) {
          $scope.date = new Date($scope.date);
        }

        return dateParser.filter($scope.date, dateFormat);
      });
    } else {
      ngModel.$formatters.push(function(value) {
        $scope.date = dateParser.fromTimezone(value, timezone);
        return value;
      });
    }

    // Detect changes in the view from the text box
    ngModel.$viewChangeListeners.push(function() {
      $scope.date = parseDateString(ngModel.$viewValue);
    });

    $element.on('keydown', inputKeydownBind);

    $popup = $compile(popupEl)($scope);
    // Prevent jQuery cache memory leak (template is now redundant after linking)
    popupEl.remove();

    if (appendToBody) {
      $document.find('body').append($popup);
    } else {
      $element.after($popup);
    }

    $scope.$on('$destroy', function() {
      if ($scope.isOpen === true) {
        if (!$rootScope.$$phase) {
          $scope.$apply(function() {
            $scope.isOpen = false;
          });
        }
      }

      $popup.remove();
      $element.off('keydown', inputKeydownBind);
      $document.off('click', documentClickBind);
      if (scrollParentEl) {
        scrollParentEl.off('scroll', positionPopup);
      }
      angular.element($window).off('resize', positionPopup);

      //Clear all watch listeners on destroy
      while (watchListeners.length) {
        watchListeners.shift()();
      }
    });
  };

  $scope.getText = function(key) {
    return $scope[key + 'Text'] || datepickerPopupConfig[key + 'Text'];
  };

  $scope.isDisabled = function(date) {
    if (date === 'today') {
      date = dateParser.fromTimezone(new Date(), timezone);
    }

    var dates = {};
    angular.forEach(['minDate', 'maxDate'], function(key) {
      if (!$scope.datepickerOptions[key]) {
        dates[key] = null;
      } else if (angular.isDate($scope.datepickerOptions[key])) {
        dates[key] = dateParser.fromTimezone(new Date($scope.datepickerOptions[key]), timezone);
      } else {
        if ($datepickerPopupLiteralWarning) {
          $log.warn('Literal date support has been deprecated, please switch to date object usage');
        }

        dates[key] = new Date(dateFilter($scope.datepickerOptions[key], 'medium'));
      }
    });

    return $scope.datepickerOptions &&
      dates.minDate && $scope.compare(date, dates.minDate) < 0 ||
      dates.maxDate && $scope.compare(date, dates.maxDate) > 0;
  };

  $scope.compare = function(date1, date2) {
    return new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()) - new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  };

  // Inner change
  $scope.dateSelection = function(dt) {
    if (angular.isDefined(dt)) {
      $scope.date = dt;
    }
    var date = $scope.date ? dateParser.filter($scope.date, dateFormat) : null; // Setting to NULL is necessary for form validators to function
    $element.val(date);
    ngModel.$setViewValue(date);

    if (closeOnDateSelection) {
      $scope.isOpen = false;
      $element[0].focus();
    }
  };

  $scope.keydown = function(evt) {
    if (evt.which === 27) {
      evt.stopPropagation();
      $scope.isOpen = false;
      $element[0].focus();
    }
  };

  $scope.select = function(date, evt) {
    evt.stopPropagation();

    if (date === 'today') {
      var today = new Date();
      if (angular.isDate($scope.date)) {
        date = new Date($scope.date);
        date.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
      } else {
        date = new Date(today.setHours(0, 0, 0, 0));
      }
    }
    $scope.dateSelection(date);
  };

  $scope.close = function(evt) {
    evt.stopPropagation();

    $scope.isOpen = false;
    $element[0].focus();
  };

  $scope.disabled = angular.isDefined($attrs.disabled) || false;
  if ($attrs.ngDisabled) {
    watchListeners.push($scope.$parent.$watch($parse($attrs.ngDisabled), function(disabled) {
      $scope.disabled = disabled;
    }));
  }

  $scope.$watch('isOpen', function(value) {
    if (value) {
      if (!$scope.disabled) {
        $timeout(function() {
          positionPopup();

          if (onOpenFocus) {
            $scope.$broadcast('uib:datepicker.focus');
          }

          $document.on('click', documentClickBind);

          var placement = $attrs.popupPlacement ? $attrs.popupPlacement : datepickerPopupConfig.placement;
          if (appendToBody || $position.parsePlacement(placement)[2]) {
            scrollParentEl = scrollParentEl || angular.element($position.scrollParent($element));
            if (scrollParentEl) {
              scrollParentEl.on('scroll', positionPopup);
            }
          } else {
            scrollParentEl = null;
          }

          angular.element($window).on('resize', positionPopup);
        }, 0, false);
      } else {
        $scope.isOpen = false;
      }
    } else {
      $document.off('click', documentClickBind);
      if (scrollParentEl) {
        scrollParentEl.off('scroll', positionPopup);
      }
      angular.element($window).off('resize', positionPopup);
    }
  });

  function cameltoDash(string) {
    return string.replace(/([A-Z])/g, function($1) { return '-' + $1.toLowerCase(); });
  }

  function parseDateString(viewValue) {
    var date = dateParser.parse(viewValue, dateFormat, $scope.date);
    if (isNaN(date)) {
      for (var i = 0; i < altInputFormats.length; i++) {
        date = dateParser.parse(viewValue, altInputFormats[i], $scope.date);
        if (!isNaN(date)) {
          return date;
        }
      }
    }
    return date;
  }

  function parseDate(viewValue) {
    if (angular.isNumber(viewValue)) {
      // presumably timestamp to date object
      viewValue = new Date(viewValue);
    }

    if (!viewValue) {
      return null;
    }

    if (angular.isDate(viewValue) && !isNaN(viewValue)) {
      return viewValue;
    }

    if (angular.isString(viewValue)) {
      var date = parseDateString(viewValue);
      if (!isNaN(date)) {
        return dateParser.toTimezone(date, timezone);
      }
    }

    return ngModel.$options && ngModel.$options.allowInvalid ? viewValue : undefined;
  }

  function validator(modelValue, viewValue) {
    var value = modelValue || viewValue;

    if (!$attrs.ngRequired && !value) {
      return true;
    }

    if (angular.isNumber(value)) {
      value = new Date(value);
    }

    if (!value) {
      return true;
    }

    if (angular.isDate(value) && !isNaN(value)) {
      return true;
    }

    if (angular.isString(value)) {
      return !isNaN(parseDateString(viewValue));
    }

    return false;
  }

  function documentClickBind(event) {
    if (!$scope.isOpen && $scope.disabled) {
      return;
    }

    var popup = $popup[0];
    var dpContainsTarget = $element[0].contains(event.target);
    // The popup node may not be an element node
    // In some browsers (IE) only element nodes have the 'contains' function
    var popupContainsTarget = popup.contains !== undefined && popup.contains(event.target);
    if ($scope.isOpen && !(dpContainsTarget || popupContainsTarget)) {
      $scope.$apply(function() {
        $scope.isOpen = false;
      });
    }
  }

  function inputKeydownBind(evt) {
    if (evt.which === 27 && $scope.isOpen) {
      evt.preventDefault();
      evt.stopPropagation();
      $scope.$apply(function() {
        $scope.isOpen = false;
      });
      $element[0].focus();
    } else if (evt.which === 40 && !$scope.isOpen) {
      evt.preventDefault();
      evt.stopPropagation();
      $scope.$apply(function() {
        $scope.isOpen = true;
      });
    }
  }

  function positionPopup() {
    if ($scope.isOpen) {
      var dpElement = angular.element($popup[0].querySelector('.uib-datepicker-popup'));
      var placement = $attrs.popupPlacement ? $attrs.popupPlacement : datepickerPopupConfig.placement;
      var position = $position.positionElements($element, dpElement, placement, appendToBody);
      dpElement.css({top: position.top + 'px', left: position.left + 'px'});
      if (dpElement.hasClass('uib-position-measure')) {
        dpElement.removeClass('uib-position-measure');
      }
    }
  }

  $scope.$on('uib:datepicker.mode', function() {
    $timeout(positionPopup, 0, false);
  });
}])

.directive('uibDatepickerPopup', function() {
  return {
    require: ['ngModel', 'uibDatepickerPopup'],
    controller: 'UibDatepickerPopupController',
    scope: {
      datepickerOptions: '=?',
      isOpen: '=?',
      currentText: '@',
      clearText: '@',
      closeText: '@'
    },
    link: function(scope, element, attrs, ctrls) {
      var ngModel = ctrls[0],
        ctrl = ctrls[1];

      ctrl.init(ngModel);
    }
  };
})

.directive('uibDatepickerPopupWrap', function() {
  return {
    replace: true,
    transclude: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepickerPopup/popup.html';
    }
  };
});

angular.module('ui.bootstrap.debounce', [])
/**
 * A helper, internal service that debounces a function
 */
  .factory('$$debounce', ['$timeout', function($timeout) {
    return function(callback, debounceTime) {
      var timeoutPromise;

      return function() {
        var self = this;
        var args = Array.prototype.slice.call(arguments);
        if (timeoutPromise) {
          $timeout.cancel(timeoutPromise);
        }

        timeoutPromise = $timeout(function() {
          callback.apply(self, args);
        }, debounceTime);
      };
    };
  }]);

angular.module('ui.bootstrap.dropdown', ['ui.bootstrap.position'])

.constant('uibDropdownConfig', {
  appendToOpenClass: 'uib-dropdown-open',
  openClass: 'open'
})

.service('uibDropdownService', ['$document', '$rootScope', function($document, $rootScope) {
  var openScope = null;

  this.open = function(dropdownScope, element) {
    if (!openScope) {
      $document.on('click', closeDropdown);
      element.on('keydown', keybindFilter);
    }

    if (openScope && openScope !== dropdownScope) {
      openScope.isOpen = false;
    }

    openScope = dropdownScope;
  };

  this.close = function(dropdownScope, element) {
    if (openScope === dropdownScope) {
      openScope = null;
      $document.off('click', closeDropdown);
      element.off('keydown', keybindFilter);
    }
  };

  var closeDropdown = function(evt) {
    // This method may still be called during the same mouse event that
    // unbound this event handler. So check openScope before proceeding.
    if (!openScope) { return; }

    if (evt && openScope.getAutoClose() === 'disabled') { return; }

    if (evt && evt.which === 3) { return; }

    var toggleElement = openScope.getToggleElement();
    if (evt && toggleElement && toggleElement[0].contains(evt.target)) {
      return;
    }

    var dropdownElement = openScope.getDropdownElement();
    if (evt && openScope.getAutoClose() === 'outsideClick' &&
      dropdownElement && dropdownElement[0].contains(evt.target)) {
      return;
    }

    openScope.isOpen = false;

    if (!$rootScope.$$phase) {
      openScope.$apply();
    }
  };

  var keybindFilter = function(evt) {
    if (evt.which === 27) {
      evt.stopPropagation();
      openScope.focusToggleElement();
      closeDropdown();
    } else if (openScope.isKeynavEnabled() && [38, 40].indexOf(evt.which) !== -1 && openScope.isOpen) {
      evt.preventDefault();
      evt.stopPropagation();
      openScope.focusDropdownEntry(evt.which);
    }
  };
}])

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
    elems[self.selectedOption].focus();
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
}])

.directive('uibDropdown', function() {
  return {
    controller: 'UibDropdownController',
    link: function(scope, element, attrs, dropdownCtrl) {
      dropdownCtrl.init();
    }
  };
})

.directive('uibDropdownMenu', function() {
  return {
    restrict: 'A',
    require: '?^uibDropdown',
    link: function(scope, element, attrs, dropdownCtrl) {
      if (!dropdownCtrl || angular.isDefined(attrs.dropdownNested)) {
        return;
      }

      element.addClass('dropdown-menu');

      var tplUrl = attrs.templateUrl;
      if (tplUrl) {
        dropdownCtrl.dropdownMenuTemplateUrl = tplUrl;
      }

      if (!dropdownCtrl.dropdownMenu) {
        dropdownCtrl.dropdownMenu = element;
      }
    }
  };
})

.directive('uibDropdownToggle', function() {
  return {
    require: '?^uibDropdown',
    link: function(scope, element, attrs, dropdownCtrl) {
      if (!dropdownCtrl) {
        return;
      }

      element.addClass('dropdown-toggle');

      dropdownCtrl.toggleElement = element;

      var toggleDropdown = function(event) {
        event.preventDefault();

        if (!element.hasClass('disabled') && !attrs.disabled) {
          scope.$apply(function() {
            dropdownCtrl.toggle();
          });
        }
      };

      element.bind('click', toggleDropdown);

      // WAI-ARIA
      element.attr({ 'aria-haspopup': true, 'aria-expanded': false });
      scope.$watch(dropdownCtrl.isOpen, function(isOpen) {
        element.attr('aria-expanded', !!isOpen);
      });

      scope.$on('$destroy', function() {
        element.unbind('click', toggleDropdown);
      });
    }
  };
});

angular.module('ui.bootstrap.stackedMap', [])
/**
 * A helper, internal data structure that acts as a map but also allows getting / removing
 * elements in the LIFO order
 */
  .factory('$$stackedMap', function() {
    return {
      createNew: function() {
        var stack = [];

        return {
          add: function(key, value) {
            stack.push({
              key: key,
              value: value
            });
          },
          get: function(key) {
            for (var i = 0; i < stack.length; i++) {
              if (key === stack[i].key) {
                return stack[i];
              }
            }
          },
          keys: function() {
            var keys = [];
            for (var i = 0; i < stack.length; i++) {
              keys.push(stack[i].key);
            }
            return keys;
          },
          top: function() {
            return stack[stack.length - 1];
          },
          remove: function(key) {
            var idx = -1;
            for (var i = 0; i < stack.length; i++) {
              if (key === stack[i].key) {
                idx = i;
                break;
              }
            }
            return stack.splice(idx, 1)[0];
          },
          removeTop: function() {
            return stack.splice(stack.length - 1, 1)[0];
          },
          length: function() {
            return stack.length;
          }
        };
      }
    };
  });
angular.module('ui.bootstrap.modal', ['ui.bootstrap.stackedMap', 'ui.bootstrap.position'])
/**
 * A helper, internal data structure that stores all references attached to key
 */
  .factory('$$multiMap', function() {
    return {
      createNew: function() {
        var map = {};

        return {
          entries: function() {
            return Object.keys(map).map(function(key) {
              return {
                key: key,
                value: map[key]
              };
            });
          },
          get: function(key) {
            return map[key];
          },
          hasKey: function(key) {
            return !!map[key];
          },
          keys: function() {
            return Object.keys(map);
          },
          put: function(key, value) {
            if (!map[key]) {
              map[key] = [];
            }

            map[key].push(value);
          },
          remove: function(key, value) {
            var values = map[key];

            if (!values) {
              return;
            }

            var idx = values.indexOf(value);

            if (idx !== -1) {
              values.splice(idx, 1);
            }

            if (!values.length) {
              delete map[key];
            }
          }
        };
      }
    };
  })

/**
 * Pluggable resolve mechanism for the modal resolve resolution
 * Supports UI Router's $resolve service
 */
  .provider('$uibResolve', function() {
    var resolve = this;
    this.resolver = null;

    this.setResolver = function(resolver) {
      this.resolver = resolver;
    };

    this.$get = ['$injector', '$q', function($injector, $q) {
      var resolver = resolve.resolver ? $injector.get(resolve.resolver) : null;
      return {
        resolve: function(invocables, locals, parent, self) {
          if (resolver) {
            return resolver.resolve(invocables, locals, parent, self);
          }

          var promises = [];

          angular.forEach(invocables, function(value) {
            if (angular.isFunction(value) || angular.isArray(value)) {
              promises.push($q.resolve($injector.invoke(value)));
            } else if (angular.isString(value)) {
              promises.push($q.resolve($injector.get(value)));
            } else {
              promises.push($q.resolve(value));
            }
          });

          return $q.all(promises).then(function(resolves) {
            var resolveObj = {};
            var resolveIter = 0;
            angular.forEach(invocables, function(value, key) {
              resolveObj[key] = resolves[resolveIter++];
            });

            return resolveObj;
          });
        }
      };
    }];
  })

/**
 * A helper directive for the $modal service. It creates a backdrop element.
 */
  .directive('uibModalBackdrop', ['$animate', '$injector', '$uibModalStack',
  function($animate, $injector, $modalStack) {
    return {
      replace: true,
      templateUrl: 'uib/template/modal/backdrop.html',
      compile: function(tElement, tAttrs) {
        tElement.addClass(tAttrs.backdropClass);
        return linkFn;
      }
    };

    function linkFn(scope, element, attrs) {
      if (attrs.modalInClass) {
        $animate.addClass(element, attrs.modalInClass);

        scope.$on($modalStack.NOW_CLOSING_EVENT, function(e, setIsAsync) {
          var done = setIsAsync();
          if (scope.modalOptions.animation) {
            $animate.removeClass(element, attrs.modalInClass).then(done);
          } else {
            done();
          }
        });
      }
    }
  }])

  .directive('uibModalWindow', ['$uibModalStack', '$q', '$animateCss', '$document',
  function($modalStack, $q, $animateCss, $document) {
    return {
      scope: {
        index: '@'
      },
      replace: true,
      transclude: true,
      templateUrl: function(tElement, tAttrs) {
        return tAttrs.templateUrl || 'uib/template/modal/window.html';
      },
      link: function(scope, element, attrs) {
        element.addClass(attrs.windowClass || '');
        element.addClass(attrs.windowTopClass || '');
        scope.size = attrs.size;

        scope.close = function(evt) {
          var modal = $modalStack.getTop();
          if (modal && modal.value.backdrop &&
            modal.value.backdrop !== 'static' &&
            evt.target === evt.currentTarget) {
            evt.preventDefault();
            evt.stopPropagation();
            $modalStack.dismiss(modal.key, 'backdrop click');
          }
        };

        // moved from template to fix issue #2280
        element.on('click', scope.close);

        // This property is only added to the scope for the purpose of detecting when this directive is rendered.
        // We can detect that by using this property in the template associated with this directive and then use
        // {@link Attribute#$observe} on it. For more details please see {@link TableColumnResize}.
        scope.$isRendered = true;

        // Deferred object that will be resolved when this modal is render.
        var modalRenderDeferObj = $q.defer();
        // Observe function will be called on next digest cycle after compilation, ensuring that the DOM is ready.
        // In order to use this way of finding whether DOM is ready, we need to observe a scope property used in modal's template.
        attrs.$observe('modalRender', function(value) {
          if (value === 'true') {
            modalRenderDeferObj.resolve();
          }
        });

        modalRenderDeferObj.promise.then(function() {
          var animationPromise = null;

          if (attrs.modalInClass) {
            animationPromise = $animateCss(element, {
              addClass: attrs.modalInClass
            }).start();

            scope.$on($modalStack.NOW_CLOSING_EVENT, function(e, setIsAsync) {
              var done = setIsAsync();
              $animateCss(element, {
                removeClass: attrs.modalInClass
              }).start().then(done);
            });
          }


          $q.when(animationPromise).then(function() {
            // Notify {@link $modalStack} that modal is rendered.
            var modal = $modalStack.getTop();
            if (modal) {
              $modalStack.modalRendered(modal.key);
            }

            /**
             * If something within the freshly-opened modal already has focus (perhaps via a
             * directive that causes focus). then no need to try and focus anything.
             */
            if (!($document[0].activeElement && element[0].contains($document[0].activeElement))) {
              var inputWithAutofocus = element[0].querySelector('[autofocus]');
              /**
               * Auto-focusing of a freshly-opened modal element causes any child elements
               * with the autofocus attribute to lose focus. This is an issue on touch
               * based devices which will show and then hide the onscreen keyboard.
               * Attempts to refocus the autofocus element via JavaScript will not reopen
               * the onscreen keyboard. Fixed by updated the focusing logic to only autofocus
               * the modal element if the modal does not contain an autofocus element.
               */
              if (inputWithAutofocus) {
                inputWithAutofocus.focus();
              } else {
                element[0].focus();
              }
            }
          });
        });
      }
    };
  }])

  .directive('uibModalAnimationClass', function() {
    return {
      compile: function(tElement, tAttrs) {
        if (tAttrs.modalAnimation) {
          tElement.addClass(tAttrs.uibModalAnimationClass);
        }
      }
    };
  })

  .directive('uibModalTransclude', function() {
    return {
      link: function(scope, element, attrs, controller, transclude) {
        transclude(scope.$parent, function(clone) {
          element.empty();
          element.append(clone);
        });
      }
    };
  })

  .factory('$uibModalStack', ['$animate', '$animateCss', '$document',
    '$compile', '$rootScope', '$q', '$$multiMap', '$$stackedMap', '$uibPosition',
    function($animate, $animateCss, $document, $compile, $rootScope, $q, $$multiMap, $$stackedMap, $uibPosition) {
      var OPENED_MODAL_CLASS = 'modal-open';

      var backdropDomEl, backdropScope;
      var openedWindows = $$stackedMap.createNew();
      var openedClasses = $$multiMap.createNew();
      var $modalStack = {
        NOW_CLOSING_EVENT: 'modal.stack.now-closing'
      };
      var topModalIndex = 0;
      var previousTopOpenedModal = null;

      //Modal focus behavior
      var tabableSelector = 'a[href], area[href], input:not([disabled]), ' +
        'button:not([disabled]),select:not([disabled]), textarea:not([disabled]), ' +
        'iframe, object, embed, *[tabindex], *[contenteditable=true]';
      var scrollbarPadding;

      function isVisible(element) {
        return !!(element.offsetWidth ||
          element.offsetHeight ||
          element.getClientRects().length);
      }

      function backdropIndex() {
        var topBackdropIndex = -1;
        var opened = openedWindows.keys();
        for (var i = 0; i < opened.length; i++) {
          if (openedWindows.get(opened[i]).value.backdrop) {
            topBackdropIndex = i;
          }
        }

        // If any backdrop exist, ensure that it's index is always
        // right below the top modal
        if (topBackdropIndex > -1 && topBackdropIndex < topModalIndex) {
          topBackdropIndex = topModalIndex;
        }
        return topBackdropIndex;
      }

      $rootScope.$watch(backdropIndex, function(newBackdropIndex) {
        if (backdropScope) {
          backdropScope.index = newBackdropIndex;
        }
      });

      function removeModalWindow(modalInstance, elementToReceiveFocus) {
        var modalWindow = openedWindows.get(modalInstance).value;
        var appendToElement = modalWindow.appendTo;

        //clean up the stack
        openedWindows.remove(modalInstance);
        previousTopOpenedModal = openedWindows.top();
        if (previousTopOpenedModal) {
          topModalIndex = parseInt(previousTopOpenedModal.value.modalDomEl.attr('index'), 10);
        }

        removeAfterAnimate(modalWindow.modalDomEl, modalWindow.modalScope, function() {
          var modalBodyClass = modalWindow.openedClass || OPENED_MODAL_CLASS;
          openedClasses.remove(modalBodyClass, modalInstance);
          var areAnyOpen = openedClasses.hasKey(modalBodyClass);
          appendToElement.toggleClass(modalBodyClass, areAnyOpen);
          if (!areAnyOpen && scrollbarPadding && scrollbarPadding.heightOverflow && scrollbarPadding.scrollbarWidth) {
            if (scrollbarPadding.originalRight) {
              appendToElement.css({paddingRight: scrollbarPadding.originalRight + 'px'});
            } else {
              appendToElement.css({paddingRight: ''});
            }
            scrollbarPadding = null;
          }
          toggleTopWindowClass(true);
        }, modalWindow.closedDeferred);
        checkRemoveBackdrop();

        //move focus to specified element if available, or else to body
        if (elementToReceiveFocus && elementToReceiveFocus.focus) {
          elementToReceiveFocus.focus();
        } else if (appendToElement.focus) {
          appendToElement.focus();
        }
      }

      // Add or remove "windowTopClass" from the top window in the stack
      function toggleTopWindowClass(toggleSwitch) {
        var modalWindow;

        if (openedWindows.length() > 0) {
          modalWindow = openedWindows.top().value;
          modalWindow.modalDomEl.toggleClass(modalWindow.windowTopClass || '', toggleSwitch);
        }
      }

      function checkRemoveBackdrop() {
        //remove backdrop if no longer needed
        if (backdropDomEl && backdropIndex() === -1) {
          var backdropScopeRef = backdropScope;
          removeAfterAnimate(backdropDomEl, backdropScope, function() {
            backdropScopeRef = null;
          });
          backdropDomEl = undefined;
          backdropScope = undefined;
        }
      }

      function removeAfterAnimate(domEl, scope, done, closedDeferred) {
        var asyncDeferred;
        var asyncPromise = null;
        var setIsAsync = function() {
          if (!asyncDeferred) {
            asyncDeferred = $q.defer();
            asyncPromise = asyncDeferred.promise;
          }

          return function asyncDone() {
            asyncDeferred.resolve();
          };
        };
        scope.$broadcast($modalStack.NOW_CLOSING_EVENT, setIsAsync);

        // Note that it's intentional that asyncPromise might be null.
        // That's when setIsAsync has not been called during the
        // NOW_CLOSING_EVENT broadcast.
        return $q.when(asyncPromise).then(afterAnimating);

        function afterAnimating() {
          if (afterAnimating.done) {
            return;
          }
          afterAnimating.done = true;

          $animate.leave(domEl).then(function() {
            domEl.remove();
            if (closedDeferred) {
              closedDeferred.resolve();
            }
          });

          scope.$destroy();
          if (done) {
            done();
          }
        }
      }

      $document.on('keydown', keydownListener);

      $rootScope.$on('$destroy', function() {
        $document.off('keydown', keydownListener);
      });

      function keydownListener(evt) {
        if (evt.isDefaultPrevented()) {
          return evt;
        }

        var modal = openedWindows.top();
        if (modal) {
          switch (evt.which) {
            case 27: {
              if (modal.value.keyboard) {
                evt.preventDefault();
                $rootScope.$apply(function() {
                  $modalStack.dismiss(modal.key, 'escape key press');
                });
              }
              break;
            }
            case 9: {
              var list = $modalStack.loadFocusElementList(modal);
              var focusChanged = false;
              if (evt.shiftKey) {
                if ($modalStack.isFocusInFirstItem(evt, list) || $modalStack.isModalFocused(evt, modal)) {
                  focusChanged = $modalStack.focusLastFocusableElement(list);
                }
              } else {
                if ($modalStack.isFocusInLastItem(evt, list)) {
                  focusChanged = $modalStack.focusFirstFocusableElement(list);
                }
              }

              if (focusChanged) {
                evt.preventDefault();
                evt.stopPropagation();
              }

              break;
            }
          }
        }
      }

      $modalStack.open = function(modalInstance, modal) {
        var modalOpener = $document[0].activeElement,
          modalBodyClass = modal.openedClass || OPENED_MODAL_CLASS;

        toggleTopWindowClass(false);

        // Store the current top first, to determine what index we ought to use
        // for the current top modal
        previousTopOpenedModal = openedWindows.top();

        openedWindows.add(modalInstance, {
          deferred: modal.deferred,
          renderDeferred: modal.renderDeferred,
          closedDeferred: modal.closedDeferred,
          modalScope: modal.scope,
          backdrop: modal.backdrop,
          keyboard: modal.keyboard,
          openedClass: modal.openedClass,
          windowTopClass: modal.windowTopClass,
          animation: modal.animation,
          appendTo: modal.appendTo
        });

        openedClasses.put(modalBodyClass, modalInstance);

        var appendToElement = modal.appendTo,
            currBackdropIndex = backdropIndex();

        if (!appendToElement.length) {
          throw new Error('appendTo element not found. Make sure that the element passed is in DOM.');
        }

        if (currBackdropIndex >= 0 && !backdropDomEl) {
          backdropScope = $rootScope.$new(true);
          backdropScope.modalOptions = modal;
          backdropScope.index = currBackdropIndex;
          backdropDomEl = angular.element('<div uib-modal-backdrop="modal-backdrop"></div>');
          backdropDomEl.attr('backdrop-class', modal.backdropClass);
          if (modal.animation) {
            backdropDomEl.attr('modal-animation', 'true');
          }
          $compile(backdropDomEl)(backdropScope);
          $animate.enter(backdropDomEl, appendToElement);
          scrollbarPadding = $uibPosition.scrollbarPadding(appendToElement);
          if (scrollbarPadding.heightOverflow && scrollbarPadding.scrollbarWidth) {
            appendToElement.css({paddingRight: scrollbarPadding.right + 'px'});
          }
        }

        // Set the top modal index based on the index of the previous top modal
        topModalIndex = previousTopOpenedModal ? parseInt(previousTopOpenedModal.value.modalDomEl.attr('index'), 10) + 1 : 0;
        var angularDomEl = angular.element('<div uib-modal-window="modal-window"></div>');
        angularDomEl.attr({
          'template-url': modal.windowTemplateUrl,
          'window-class': modal.windowClass,
          'window-top-class': modal.windowTopClass,
          'size': modal.size,
          'index': topModalIndex,
          'animate': 'animate'
        }).html(modal.content);
        if (modal.animation) {
          angularDomEl.attr('modal-animation', 'true');
        }

        appendToElement.addClass(modalBodyClass);
        $animate.enter($compile(angularDomEl)(modal.scope), appendToElement);

        openedWindows.top().value.modalDomEl = angularDomEl;
        openedWindows.top().value.modalOpener = modalOpener;
      };

      function broadcastClosing(modalWindow, resultOrReason, closing) {
        return !modalWindow.value.modalScope.$broadcast('modal.closing', resultOrReason, closing).defaultPrevented;
      }

      $modalStack.close = function(modalInstance, result) {
        var modalWindow = openedWindows.get(modalInstance);
        if (modalWindow && broadcastClosing(modalWindow, result, true)) {
          modalWindow.value.modalScope.$$uibDestructionScheduled = true;
          modalWindow.value.deferred.resolve(result);
          removeModalWindow(modalInstance, modalWindow.value.modalOpener);
          return true;
        }
        return !modalWindow;
      };

      $modalStack.dismiss = function(modalInstance, reason) {
        var modalWindow = openedWindows.get(modalInstance);
        if (modalWindow && broadcastClosing(modalWindow, reason, false)) {
          modalWindow.value.modalScope.$$uibDestructionScheduled = true;
          modalWindow.value.deferred.reject(reason);
          removeModalWindow(modalInstance, modalWindow.value.modalOpener);
          return true;
        }
        return !modalWindow;
      };

      $modalStack.dismissAll = function(reason) {
        var topModal = this.getTop();
        while (topModal && this.dismiss(topModal.key, reason)) {
          topModal = this.getTop();
        }
      };

      $modalStack.getTop = function() {
        return openedWindows.top();
      };

      $modalStack.modalRendered = function(modalInstance) {
        var modalWindow = openedWindows.get(modalInstance);
        if (modalWindow) {
          modalWindow.value.renderDeferred.resolve();
        }
      };

      $modalStack.focusFirstFocusableElement = function(list) {
        if (list.length > 0) {
          list[0].focus();
          return true;
        }
        return false;
      };

      $modalStack.focusLastFocusableElement = function(list) {
        if (list.length > 0) {
          list[list.length - 1].focus();
          return true;
        }
        return false;
      };

      $modalStack.isModalFocused = function(evt, modalWindow) {
        if (evt && modalWindow) {
          var modalDomEl = modalWindow.value.modalDomEl;
          if (modalDomEl && modalDomEl.length) {
            return (evt.target || evt.srcElement) === modalDomEl[0];
          }
        }
        return false;
      };

      $modalStack.isFocusInFirstItem = function(evt, list) {
        if (list.length > 0) {
          return (evt.target || evt.srcElement) === list[0];
        }
        return false;
      };

      $modalStack.isFocusInLastItem = function(evt, list) {
        if (list.length > 0) {
          return (evt.target || evt.srcElement) === list[list.length - 1];
        }
        return false;
      };

      $modalStack.loadFocusElementList = function(modalWindow) {
        if (modalWindow) {
          var modalDomE1 = modalWindow.value.modalDomEl;
          if (modalDomE1 && modalDomE1.length) {
            var elements = modalDomE1[0].querySelectorAll(tabableSelector);
            return elements ?
              Array.prototype.filter.call(elements, function(element) {
                return isVisible(element);
              }) : elements;
          }
        }
      };

      return $modalStack;
    }])

  .provider('$uibModal', function() {
    var $modalProvider = {
      options: {
        animation: true,
        backdrop: true, //can also be false or 'static'
        keyboard: true
      },
      $get: ['$rootScope', '$q', '$document', '$templateRequest', '$controller', '$uibResolve', '$uibModalStack',
        function ($rootScope, $q, $document, $templateRequest, $controller, $uibResolve, $modalStack) {
          var $modal = {};

          function getTemplatePromise(options) {
            return options.template ? $q.when(options.template) :
              $templateRequest(angular.isFunction(options.templateUrl) ?
                options.templateUrl() : options.templateUrl);
          }

          var promiseChain = null;
          $modal.getPromiseChain = function() {
            return promiseChain;
          };

          $modal.open = function(modalOptions) {
            var modalResultDeferred = $q.defer();
            var modalOpenedDeferred = $q.defer();
            var modalClosedDeferred = $q.defer();
            var modalRenderDeferred = $q.defer();

            //prepare an instance of a modal to be injected into controllers and returned to a caller
            var modalInstance = {
              result: modalResultDeferred.promise,
              opened: modalOpenedDeferred.promise,
              closed: modalClosedDeferred.promise,
              rendered: modalRenderDeferred.promise,
              close: function (result) {
                return $modalStack.close(modalInstance, result);
              },
              dismiss: function (reason) {
                return $modalStack.dismiss(modalInstance, reason);
              }
            };

            //merge and clean up options
            modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
            modalOptions.resolve = modalOptions.resolve || {};
            modalOptions.appendTo = modalOptions.appendTo || $document.find('body').eq(0);

            //verify options
            if (!modalOptions.template && !modalOptions.templateUrl) {
              throw new Error('One of template or templateUrl options is required.');
            }

            var templateAndResolvePromise =
              $q.all([getTemplatePromise(modalOptions), $uibResolve.resolve(modalOptions.resolve, {}, null, null)]);

            function resolveWithTemplate() {
              return templateAndResolvePromise;
            }

            // Wait for the resolution of the existing promise chain.
            // Then switch to our own combined promise dependency (regardless of how the previous modal fared).
            // Then add to $modalStack and resolve opened.
            // Finally clean up the chain variable if no subsequent modal has overwritten it.
            var samePromise;
            samePromise = promiseChain = $q.all([promiseChain])
              .then(resolveWithTemplate, resolveWithTemplate)
              .then(function resolveSuccess(tplAndVars) {
                var providedScope = modalOptions.scope || $rootScope;

                var modalScope = providedScope.$new();
                modalScope.$close = modalInstance.close;
                modalScope.$dismiss = modalInstance.dismiss;

                modalScope.$on('$destroy', function() {
                  if (!modalScope.$$uibDestructionScheduled) {
                    modalScope.$dismiss('$uibUnscheduledDestruction');
                  }
                });

                var ctrlInstance, ctrlInstantiate, ctrlLocals = {};

                //controllers
                if (modalOptions.controller) {
                  ctrlLocals.$scope = modalScope;
                  ctrlLocals.$uibModalInstance = modalInstance;
                  angular.forEach(tplAndVars[1], function(value, key) {
                    ctrlLocals[key] = value;
                  });

                  // the third param will make the controller instantiate later,private api
                  // @see https://github.com/angular/angular.js/blob/master/src/ng/controller.js#L126
                  ctrlInstantiate = $controller(modalOptions.controller, ctrlLocals, true);
                  if (modalOptions.controllerAs) {
                    ctrlInstance = ctrlInstantiate.instance;

                    if (modalOptions.bindToController) {
                      ctrlInstance.$close = modalScope.$close;
                      ctrlInstance.$dismiss = modalScope.$dismiss;
                      angular.extend(ctrlInstance, providedScope);
                    }

                    ctrlInstance = ctrlInstantiate();

                    modalScope[modalOptions.controllerAs] = ctrlInstance;
                  } else {
                    ctrlInstance = ctrlInstantiate();
                  }

                  if (angular.isFunction(ctrlInstance.$onInit)) {
                    ctrlInstance.$onInit();
                  }
                }

                $modalStack.open(modalInstance, {
                  scope: modalScope,
                  deferred: modalResultDeferred,
                  renderDeferred: modalRenderDeferred,
                  closedDeferred: modalClosedDeferred,
                  content: tplAndVars[0],
                  animation: modalOptions.animation,
                  backdrop: modalOptions.backdrop,
                  keyboard: modalOptions.keyboard,
                  backdropClass: modalOptions.backdropClass,
                  windowTopClass: modalOptions.windowTopClass,
                  windowClass: modalOptions.windowClass,
                  windowTemplateUrl: modalOptions.windowTemplateUrl,
                  size: modalOptions.size,
                  openedClass: modalOptions.openedClass,
                  appendTo: modalOptions.appendTo
                });
                modalOpenedDeferred.resolve(true);

            }, function resolveError(reason) {
              modalOpenedDeferred.reject(reason);
              modalResultDeferred.reject(reason);
            })['finally'](function() {
              if (promiseChain === samePromise) {
                promiseChain = null;
              }
            });

            return modalInstance;
          };

          return $modal;
        }
      ]
    };

    return $modalProvider;
  });

angular.module('ui.bootstrap.paging', [])
/**
 * Helper internal service for generating common controller code between the
 * pager and pagination components
 */
.factory('uibPaging', ['$parse', function($parse) {
  return {
    create: function(ctrl, $scope, $attrs) {
      ctrl.setNumPages = $attrs.numPages ? $parse($attrs.numPages).assign : angular.noop;
      ctrl.ngModelCtrl = { $setViewValue: angular.noop }; // nullModelCtrl
      ctrl._watchers = [];

      ctrl.init = function(ngModelCtrl, config) {
        ctrl.ngModelCtrl = ngModelCtrl;
        ctrl.config = config;

        ngModelCtrl.$render = function() {
          ctrl.render();
        };

        if ($attrs.itemsPerPage) {
          ctrl._watchers.push($scope.$parent.$watch($attrs.itemsPerPage, function(value) {
            ctrl.itemsPerPage = parseInt(value, 10);
            $scope.totalPages = ctrl.calculateTotalPages();
            ctrl.updatePage();
          }));
        } else {
          ctrl.itemsPerPage = config.itemsPerPage;
        }

        $scope.$watch('totalItems', function(newTotal, oldTotal) {
          if (angular.isDefined(newTotal) || newTotal !== oldTotal) {
            $scope.totalPages = ctrl.calculateTotalPages();
            ctrl.updatePage();
          }
        });
      };

      ctrl.calculateTotalPages = function() {
        var totalPages = ctrl.itemsPerPage < 1 ? 1 : Math.ceil($scope.totalItems / ctrl.itemsPerPage);
        return Math.max(totalPages || 0, 1);
      };

      ctrl.render = function() {
        $scope.page = parseInt(ctrl.ngModelCtrl.$viewValue, 10) || 1;
      };

      $scope.selectPage = function(page, evt) {
        if (evt) {
          evt.preventDefault();
        }

        var clickAllowed = !$scope.ngDisabled || !evt;
        if (clickAllowed && $scope.page !== page && page > 0 && page <= $scope.totalPages) {
          if (evt && evt.target) {
            evt.target.blur();
          }
          ctrl.ngModelCtrl.$setViewValue(page);
          ctrl.ngModelCtrl.$render();
        }
      };

      $scope.getText = function(key) {
        return $scope[key + 'Text'] || ctrl.config[key + 'Text'];
      };

      $scope.noPrevious = function() {
        return $scope.page === 1;
      };

      $scope.noNext = function() {
        return $scope.page === $scope.totalPages;
      };

      ctrl.updatePage = function() {
        ctrl.setNumPages($scope.$parent, $scope.totalPages); // Readonly variable

        if ($scope.page > $scope.totalPages) {
          $scope.selectPage($scope.totalPages);
        } else {
          ctrl.ngModelCtrl.$render();
        }
      };

      $scope.$on('$destroy', function() {
        while (ctrl._watchers.length) {
          ctrl._watchers.shift()();
        }
      });
    }
  };
}]);

angular.module('ui.bootstrap.pager', ['ui.bootstrap.paging'])

.controller('UibPagerController', ['$scope', '$attrs', 'uibPaging', 'uibPagerConfig', function($scope, $attrs, uibPaging, uibPagerConfig) {
  $scope.align = angular.isDefined($attrs.align) ? $scope.$parent.$eval($attrs.align) : uibPagerConfig.align;

  uibPaging.create(this, $scope, $attrs);
}])

.constant('uibPagerConfig', {
  itemsPerPage: 10,
  previousText: '« Previous',
  nextText: 'Next »',
  align: true
})

.directive('uibPager', ['uibPagerConfig', function(uibPagerConfig) {
  return {
    scope: {
      totalItems: '=',
      previousText: '@',
      nextText: '@',
      ngDisabled: '='
    },
    require: ['uibPager', '?ngModel'],
    controller: 'UibPagerController',
    controllerAs: 'pager',
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/pager/pager.html';
    },
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var paginationCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if (!ngModelCtrl) {
        return; // do nothing if no ng-model
      }

      paginationCtrl.init(ngModelCtrl, uibPagerConfig);
    }
  };
}]);

angular.module('ui.bootstrap.pagination', ['ui.bootstrap.paging'])
.controller('UibPaginationController', ['$scope', '$attrs', '$parse', 'uibPaging', 'uibPaginationConfig', function($scope, $attrs, $parse, uibPaging, uibPaginationConfig) {
  var ctrl = this;
  // Setup configuration parameters
  var maxSize = angular.isDefined($attrs.maxSize) ? $scope.$parent.$eval($attrs.maxSize) : uibPaginationConfig.maxSize,
    rotate = angular.isDefined($attrs.rotate) ? $scope.$parent.$eval($attrs.rotate) : uibPaginationConfig.rotate,
    forceEllipses = angular.isDefined($attrs.forceEllipses) ? $scope.$parent.$eval($attrs.forceEllipses) : uibPaginationConfig.forceEllipses,
    boundaryLinkNumbers = angular.isDefined($attrs.boundaryLinkNumbers) ? $scope.$parent.$eval($attrs.boundaryLinkNumbers) : uibPaginationConfig.boundaryLinkNumbers,
    pageLabel = angular.isDefined($attrs.pageLabel) ? function(idx) { return $scope.$parent.$eval($attrs.pageLabel, {$page: idx}); } : angular.identity;
  $scope.boundaryLinks = angular.isDefined($attrs.boundaryLinks) ? $scope.$parent.$eval($attrs.boundaryLinks) : uibPaginationConfig.boundaryLinks;
  $scope.directionLinks = angular.isDefined($attrs.directionLinks) ? $scope.$parent.$eval($attrs.directionLinks) : uibPaginationConfig.directionLinks;

  uibPaging.create(this, $scope, $attrs);

  if ($attrs.maxSize) {
    ctrl._watchers.push($scope.$parent.$watch($parse($attrs.maxSize), function(value) {
      maxSize = parseInt(value, 10);
      ctrl.render();
    }));
  }

  // Create page object used in template
  function makePage(number, text, isActive) {
    return {
      number: number,
      text: text,
      active: isActive
    };
  }

  function getPages(currentPage, totalPages) {
    var pages = [];

    // Default page limits
    var startPage = 1, endPage = totalPages;
    var isMaxSized = angular.isDefined(maxSize) && maxSize < totalPages;

    // recompute if maxSize
    if (isMaxSized) {
      if (rotate) {
        // Current page is displayed in the middle of the visible ones
        startPage = Math.max(currentPage - Math.floor(maxSize / 2), 1);
        endPage = startPage + maxSize - 1;

        // Adjust if limit is exceeded
        if (endPage > totalPages) {
          endPage = totalPages;
          startPage = endPage - maxSize + 1;
        }
      } else {
        // Visible pages are paginated with maxSize
        startPage = (Math.ceil(currentPage / maxSize) - 1) * maxSize + 1;

        // Adjust last page if limit is exceeded
        endPage = Math.min(startPage + maxSize - 1, totalPages);
      }
    }

    // Add page number links
    for (var number = startPage; number <= endPage; number++) {
      var page = makePage(number, pageLabel(number), number === currentPage);
      pages.push(page);
    }

    // Add links to move between page sets
    if (isMaxSized && maxSize > 0 && (!rotate || forceEllipses || boundaryLinkNumbers)) {
      if (startPage > 1) {
        if (!boundaryLinkNumbers || startPage > 3) { //need ellipsis for all options unless range is too close to beginning
        var previousPageSet = makePage(startPage - 1, '...', false);
        pages.unshift(previousPageSet);
      }
        if (boundaryLinkNumbers) {
          if (startPage === 3) { //need to replace ellipsis when the buttons would be sequential
            var secondPageLink = makePage(2, '2', false);
            pages.unshift(secondPageLink);
          }
          //add the first page
          var firstPageLink = makePage(1, '1', false);
          pages.unshift(firstPageLink);
        }
      }

      if (endPage < totalPages) {
        if (!boundaryLinkNumbers || endPage < totalPages - 2) { //need ellipsis for all options unless range is too close to end
        var nextPageSet = makePage(endPage + 1, '...', false);
        pages.push(nextPageSet);
      }
        if (boundaryLinkNumbers) {
          if (endPage === totalPages - 2) { //need to replace ellipsis when the buttons would be sequential
            var secondToLastPageLink = makePage(totalPages - 1, totalPages - 1, false);
            pages.push(secondToLastPageLink);
          }
          //add the last page
          var lastPageLink = makePage(totalPages, totalPages, false);
          pages.push(lastPageLink);
        }
      }
    }
    return pages;
  }

  var originalRender = this.render;
  this.render = function() {
    originalRender();
    if ($scope.page > 0 && $scope.page <= $scope.totalPages) {
      $scope.pages = getPages($scope.page, $scope.totalPages);
    }
  };
}])

.constant('uibPaginationConfig', {
  itemsPerPage: 10,
  boundaryLinks: false,
  boundaryLinkNumbers: false,
  directionLinks: true,
  firstText: 'First',
  previousText: 'Previous',
  nextText: 'Next',
  lastText: 'Last',
  rotate: true,
  forceEllipses: false
})

.directive('uibPagination', ['$parse', 'uibPaginationConfig', function($parse, uibPaginationConfig) {
  return {
    scope: {
      totalItems: '=',
      firstText: '@',
      previousText: '@',
      nextText: '@',
      lastText: '@',
      ngDisabled:'='
    },
    require: ['uibPagination', '?ngModel'],
    controller: 'UibPaginationController',
    controllerAs: 'pagination',
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/pagination/pagination.html';
    },
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var paginationCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if (!ngModelCtrl) {
         return; // do nothing if no ng-model
      }

      paginationCtrl.init(ngModelCtrl, uibPaginationConfig);
    }
  };
}]);

/**
 * The following features are still outstanding: animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, html tooltips, and selector delegation.
 */
angular.module('ui.bootstrap.tooltip', ['ui.bootstrap.position', 'ui.bootstrap.stackedMap'])

/**
 * The $tooltip service creates tooltip- and popover-like directives as well as
 * houses global options for them.
 */
.provider('$uibTooltip', function() {
  // The default options tooltip and popover.
  var defaultOptions = {
    placement: 'top',
    placementClassPrefix: '',
    animation: true,
    popupDelay: 0,
    popupCloseDelay: 0,
    useContentExp: false
  };

  // Default hide triggers for each show trigger
  var triggerMap = {
    'mouseenter': 'mouseleave',
    'click': 'click',
    'outsideClick': 'outsideClick',
    'focus': 'blur',
    'none': ''
  };

  // The options specified to the provider globally.
  var globalOptions = {};

  /**
   * `options({})` allows global configuration of all tooltips in the
   * application.
   *
   *   var app = angular.module( 'App', ['ui.bootstrap.tooltip'], function( $tooltipProvider ) {
   *     // place tooltips left instead of top by default
   *     $tooltipProvider.options( { placement: 'left' } );
   *   });
   */
	this.options = function(value) {
		angular.extend(globalOptions, value);
	};

  /**
   * This allows you to extend the set of trigger mappings available. E.g.:
   *
   *   $tooltipProvider.setTriggers( { 'openTrigger': 'closeTrigger' } );
   */
  this.setTriggers = function setTriggers(triggers) {
    angular.extend(triggerMap, triggers);
  };

  /**
   * This is a helper function for translating camel-case to snake_case.
   */
  function snake_case(name) {
    var regexp = /[A-Z]/g;
    var separator = '-';
    return name.replace(regexp, function(letter, pos) {
      return (pos ? separator : '') + letter.toLowerCase();
    });
  }

  /**
   * Returns the actual instance of the $tooltip service.
   * TODO support multiple triggers
   */
  this.$get = ['$window', '$compile', '$timeout', '$document', '$uibPosition', '$interpolate', '$rootScope', '$parse', '$$stackedMap', function($window, $compile, $timeout, $document, $position, $interpolate, $rootScope, $parse, $$stackedMap) {
    var openedTooltips = $$stackedMap.createNew();
    $document.on('keypress', keypressListener);

    $rootScope.$on('$destroy', function() {
      $document.off('keypress', keypressListener);
    });

    function keypressListener(e) {
      if (e.which === 27) {
        var last = openedTooltips.top();
        if (last) {
          last.value.close();
          openedTooltips.removeTop();
          last = null;
        }
      }
    }

    return function $tooltip(ttType, prefix, defaultTriggerShow, options) {
      options = angular.extend({}, defaultOptions, globalOptions, options);

      /**
       * Returns an object of show and hide triggers.
       *
       * If a trigger is supplied,
       * it is used to show the tooltip; otherwise, it will use the `trigger`
       * option passed to the `$tooltipProvider.options` method; else it will
       * default to the trigger supplied to this directive factory.
       *
       * The hide trigger is based on the show trigger. If the `trigger` option
       * was passed to the `$tooltipProvider.options` method, it will use the
       * mapped trigger from `triggerMap` or the passed trigger if the map is
       * undefined; otherwise, it uses the `triggerMap` value of the show
       * trigger; else it will just use the show trigger.
       */
      function getTriggers(trigger) {
        var show = (trigger || options.trigger || defaultTriggerShow).split(' ');
        var hide = show.map(function(trigger) {
          return triggerMap[trigger] || trigger;
        });
        return {
          show: show,
          hide: hide
        };
      }

      var directiveName = snake_case(ttType);

      var startSym = $interpolate.startSymbol();
      var endSym = $interpolate.endSymbol();
      var template =
        '<div '+ directiveName + '-popup ' +
          'uib-title="' + startSym + 'title' + endSym + '" ' +
          (options.useContentExp ?
            'content-exp="contentExp()" ' :
            'content="' + startSym + 'content' + endSym + '" ') +
          'placement="' + startSym + 'placement' + endSym + '" ' +
          'popup-class="' + startSym + 'popupClass' + endSym + '" ' +
          'animation="animation" ' +
          'is-open="isOpen" ' +
          'origin-scope="origScope" ' +
          'class="uib-position-measure"' +
          '>' +
        '</div>';

      return {
        compile: function(tElem, tAttrs) {
          var tooltipLinker = $compile(template);

          return function link(scope, element, attrs, tooltipCtrl) {
            var tooltip;
            var tooltipLinkedScope;
            var transitionTimeout;
            var showTimeout;
            var hideTimeout;
            var positionTimeout;
            var appendToBody = angular.isDefined(options.appendToBody) ? options.appendToBody : false;
            var triggers = getTriggers(undefined);
            var hasEnableExp = angular.isDefined(attrs[prefix + 'Enable']);
            var ttScope = scope.$new(true);
            var repositionScheduled = false;
            var isOpenParse = angular.isDefined(attrs[prefix + 'IsOpen']) ? $parse(attrs[prefix + 'IsOpen']) : false;
            var contentParse = options.useContentExp ? $parse(attrs[ttType]) : false;
            var observers = [];
            var lastPlacement;

            var positionTooltip = function() {
              // check if tooltip exists and is not empty
              if (!tooltip || !tooltip.html()) { return; }

              if (!positionTimeout) {
                positionTimeout = $timeout(function() {
                  var ttPosition = $position.positionElements(element, tooltip, ttScope.placement, appendToBody);
                  tooltip.css({ top: ttPosition.top + 'px', left: ttPosition.left + 'px' });

                  if (!tooltip.hasClass(ttPosition.placement.split('-')[0])) {
                    tooltip.removeClass(lastPlacement.split('-')[0]);
                    tooltip.addClass(ttPosition.placement.split('-')[0]);
                  }

                  if (!tooltip.hasClass(options.placementClassPrefix + ttPosition.placement)) {
                    tooltip.removeClass(options.placementClassPrefix + lastPlacement);
                    tooltip.addClass(options.placementClassPrefix + ttPosition.placement);
                  }

                  // first time through tt element will have the
                  // uib-position-measure class or if the placement
                  // has changed we need to position the arrow.
                  if (tooltip.hasClass('uib-position-measure')) {
                    $position.positionArrow(tooltip, ttPosition.placement);
                    tooltip.removeClass('uib-position-measure');
                  } else if (lastPlacement !== ttPosition.placement) {
                    $position.positionArrow(tooltip, ttPosition.placement);
                  }
                  lastPlacement = ttPosition.placement;

                  positionTimeout = null;
                }, 0, false);
              }
            };

            // Set up the correct scope to allow transclusion later
            ttScope.origScope = scope;

            // By default, the tooltip is not open.
            // TODO add ability to start tooltip opened
            ttScope.isOpen = false;
            openedTooltips.add(ttScope, {
              close: hide
            });

            function toggleTooltipBind() {
              if (!ttScope.isOpen) {
                showTooltipBind();
              } else {
                hideTooltipBind();
              }
            }

            // Show the tooltip with delay if specified, otherwise show it immediately
            function showTooltipBind() {
              if (hasEnableExp && !scope.$eval(attrs[prefix + 'Enable'])) {
                return;
              }

              cancelHide();
              prepareTooltip();

              if (ttScope.popupDelay) {
                // Do nothing if the tooltip was already scheduled to pop-up.
                // This happens if show is triggered multiple times before any hide is triggered.
                if (!showTimeout) {
                  showTimeout = $timeout(show, ttScope.popupDelay, false);
                }
              } else {
                show();
              }
            }

            function hideTooltipBind() {
              cancelShow();

              if (ttScope.popupCloseDelay) {
                if (!hideTimeout) {
                  hideTimeout = $timeout(hide, ttScope.popupCloseDelay, false);
                }
              } else {
                hide();
              }
            }

            // Show the tooltip popup element.
            function show() {
              cancelShow();
              cancelHide();

              // Don't show empty tooltips.
              if (!ttScope.content) {
                return angular.noop;
              }

              createTooltip();

              // And show the tooltip.
              ttScope.$evalAsync(function() {
                ttScope.isOpen = true;
                assignIsOpen(true);
                positionTooltip();
              });
            }

            function cancelShow() {
              if (showTimeout) {
                $timeout.cancel(showTimeout);
                showTimeout = null;
              }

              if (positionTimeout) {
                $timeout.cancel(positionTimeout);
                positionTimeout = null;
              }
            }

            // Hide the tooltip popup element.
            function hide() {
              if (!ttScope) {
                return;
              }

              // First things first: we don't show it anymore.
              ttScope.$evalAsync(function() {
                if (ttScope) {
                  ttScope.isOpen = false;
                  assignIsOpen(false);
                  // And now we remove it from the DOM. However, if we have animation, we
                  // need to wait for it to expire beforehand.
                  // FIXME: this is a placeholder for a port of the transitions library.
                  // The fade transition in TWBS is 150ms.
                  if (ttScope.animation) {
                    if (!transitionTimeout) {
                      transitionTimeout = $timeout(removeTooltip, 150, false);
                    }
                  } else {
                    removeTooltip();
                  }
                }
              });
            }

            function cancelHide() {
              if (hideTimeout) {
                $timeout.cancel(hideTimeout);
                hideTimeout = null;
              }

              if (transitionTimeout) {
                $timeout.cancel(transitionTimeout);
                transitionTimeout = null;
              }
            }

            function createTooltip() {
              // There can only be one tooltip element per directive shown at once.
              if (tooltip) {
                return;
              }

              tooltipLinkedScope = ttScope.$new();
              tooltip = tooltipLinker(tooltipLinkedScope, function(tooltip) {
                if (appendToBody) {
                  $document.find('body').append(tooltip);
                } else {
                  element.after(tooltip);
                }
              });

              prepObservers();
            }

            function removeTooltip() {
              cancelShow();
              cancelHide();
              unregisterObservers();

              if (tooltip) {
                tooltip.remove();
                tooltip = null;
              }
              if (tooltipLinkedScope) {
                tooltipLinkedScope.$destroy();
                tooltipLinkedScope = null;
              }
            }

            /**
             * Set the initial scope values. Once
             * the tooltip is created, the observers
             * will be added to keep things in sync.
             */
            function prepareTooltip() {
              ttScope.title = attrs[prefix + 'Title'];
              if (contentParse) {
                ttScope.content = contentParse(scope);
              } else {
                ttScope.content = attrs[ttType];
              }

              ttScope.popupClass = attrs[prefix + 'Class'];
              ttScope.placement = angular.isDefined(attrs[prefix + 'Placement']) ? attrs[prefix + 'Placement'] : options.placement;
              var placement = $position.parsePlacement(ttScope.placement);
              lastPlacement = placement[1] ? placement[0] + '-' + placement[1] : placement[0];

              var delay = parseInt(attrs[prefix + 'PopupDelay'], 10);
              var closeDelay = parseInt(attrs[prefix + 'PopupCloseDelay'], 10);
              ttScope.popupDelay = !isNaN(delay) ? delay : options.popupDelay;
              ttScope.popupCloseDelay = !isNaN(closeDelay) ? closeDelay : options.popupCloseDelay;
            }

            function assignIsOpen(isOpen) {
              if (isOpenParse && angular.isFunction(isOpenParse.assign)) {
                isOpenParse.assign(scope, isOpen);
              }
            }

            ttScope.contentExp = function() {
              return ttScope.content;
            };

            /**
             * Observe the relevant attributes.
             */
            attrs.$observe('disabled', function(val) {
              if (val) {
                cancelShow();
              }

              if (val && ttScope.isOpen) {
                hide();
              }
            });

            if (isOpenParse) {
              scope.$watch(isOpenParse, function(val) {
                if (ttScope && !val === ttScope.isOpen) {
                  toggleTooltipBind();
                }
              });
            }

            function prepObservers() {
              observers.length = 0;

              if (contentParse) {
                observers.push(
                  scope.$watch(contentParse, function(val) {
                    ttScope.content = val;
                    if (!val && ttScope.isOpen) {
                      hide();
                    }
                  })
                );

                observers.push(
                  tooltipLinkedScope.$watch(function() {
                    if (!repositionScheduled) {
                      repositionScheduled = true;
                      tooltipLinkedScope.$$postDigest(function() {
                        repositionScheduled = false;
                        if (ttScope && ttScope.isOpen) {
                          positionTooltip();
                        }
                      });
                    }
                  })
                );
              } else {
                observers.push(
                  attrs.$observe(ttType, function(val) {
                    ttScope.content = val;
                    if (!val && ttScope.isOpen) {
                      hide();
                    } else {
                      positionTooltip();
                    }
                  })
                );
              }

              observers.push(
                attrs.$observe(prefix + 'Title', function(val) {
                  ttScope.title = val;
                  if (ttScope.isOpen) {
                    positionTooltip();
                  }
                })
              );

              observers.push(
                attrs.$observe(prefix + 'Placement', function(val) {
                  ttScope.placement = val ? val : options.placement;
                  if (ttScope.isOpen) {
                    positionTooltip();
                  }
                })
              );
            }

            function unregisterObservers() {
              if (observers.length) {
                angular.forEach(observers, function(observer) {
                  observer();
                });
                observers.length = 0;
              }
            }

            // hide tooltips/popovers for outsideClick trigger
            function bodyHideTooltipBind(e) {
              if (!ttScope || !ttScope.isOpen || !tooltip) {
                return;
              }
              // make sure the tooltip/popover link or tool tooltip/popover itself were not clicked
              if (!element[0].contains(e.target) && !tooltip[0].contains(e.target)) {
                hideTooltipBind();
              }
            }

            var unregisterTriggers = function() {
              triggers.show.forEach(function(trigger) {
                if (trigger === 'outsideClick') {
                  element.off('click', toggleTooltipBind);
                } else {
                  element.off(trigger, showTooltipBind);
                  element.off(trigger, toggleTooltipBind);
                }
              });
              triggers.hide.forEach(function(trigger) {
                if (trigger === 'outsideClick') {
                  $document.off('click', bodyHideTooltipBind);
                } else {
                  element.off(trigger, hideTooltipBind);
                }
              });
            };

            function prepTriggers() {
              var val = attrs[prefix + 'Trigger'];
              unregisterTriggers();

              triggers = getTriggers(val);

              if (triggers.show !== 'none') {
                triggers.show.forEach(function(trigger, idx) {
                  if (trigger === 'outsideClick') {
                    element.on('click', toggleTooltipBind);
                    $document.on('click', bodyHideTooltipBind);
                  } else if (trigger === triggers.hide[idx]) {
                    element.on(trigger, toggleTooltipBind);
                  } else if (trigger) {
                    element.on(trigger, showTooltipBind);
                    element.on(triggers.hide[idx], hideTooltipBind);
                  }

                  element.on('keypress', function(e) {
                    if (e.which === 27) {
                      hideTooltipBind();
                    }
                  });
                });
              }
            }

            prepTriggers();

            var animation = scope.$eval(attrs[prefix + 'Animation']);
            ttScope.animation = angular.isDefined(animation) ? !!animation : options.animation;

            var appendToBodyVal;
            var appendKey = prefix + 'AppendToBody';
            if (appendKey in attrs && attrs[appendKey] === undefined) {
              appendToBodyVal = true;
            } else {
              appendToBodyVal = scope.$eval(attrs[appendKey]);
            }

            appendToBody = angular.isDefined(appendToBodyVal) ? appendToBodyVal : appendToBody;

            // Make sure tooltip is destroyed and removed.
            scope.$on('$destroy', function onDestroyTooltip() {
              unregisterTriggers();
              removeTooltip();
              openedTooltips.remove(ttScope);
              ttScope = null;
            });
          };
        }
      };
    };
  }];
})

// This is mostly ngInclude code but with a custom scope
.directive('uibTooltipTemplateTransclude', [
         '$animate', '$sce', '$compile', '$templateRequest',
function ($animate, $sce, $compile, $templateRequest) {
  return {
    link: function(scope, elem, attrs) {
      var origScope = scope.$eval(attrs.tooltipTemplateTranscludeScope);

      var changeCounter = 0,
        currentScope,
        previousElement,
        currentElement;

      var cleanupLastIncludeContent = function() {
        if (previousElement) {
          previousElement.remove();
          previousElement = null;
        }

        if (currentScope) {
          currentScope.$destroy();
          currentScope = null;
        }

        if (currentElement) {
          $animate.leave(currentElement).then(function() {
            previousElement = null;
          });
          previousElement = currentElement;
          currentElement = null;
        }
      };

      scope.$watch($sce.parseAsResourceUrl(attrs.uibTooltipTemplateTransclude), function(src) {
        var thisChangeId = ++changeCounter;

        if (src) {
          //set the 2nd param to true to ignore the template request error so that the inner
          //contents and scope can be cleaned up.
          $templateRequest(src, true).then(function(response) {
            if (thisChangeId !== changeCounter) { return; }
            var newScope = origScope.$new();
            var template = response;

            var clone = $compile(template)(newScope, function(clone) {
              cleanupLastIncludeContent();
              $animate.enter(clone, elem);
            });

            currentScope = newScope;
            currentElement = clone;

            currentScope.$emit('$includeContentLoaded', src);
          }, function() {
            if (thisChangeId === changeCounter) {
              cleanupLastIncludeContent();
              scope.$emit('$includeContentError', src);
            }
          });
          scope.$emit('$includeContentRequested', src);
        } else {
          cleanupLastIncludeContent();
        }
      });

      scope.$on('$destroy', cleanupLastIncludeContent);
    }
  };
}])

/**
 * Note that it's intentional that these classes are *not* applied through $animate.
 * They must not be animated as they're expected to be present on the tooltip on
 * initialization.
 */
.directive('uibTooltipClasses', ['$uibPosition', function($uibPosition) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      // need to set the primary position so the
      // arrow has space during position measure.
      // tooltip.positionTooltip()
      if (scope.placement) {
        // // There are no top-left etc... classes
        // // in TWBS, so we need the primary position.
        var position = $uibPosition.parsePlacement(scope.placement);
        element.addClass(position[0]);
      }

      if (scope.popupClass) {
        element.addClass(scope.popupClass);
      }

      if (scope.animation()) {
        element.addClass(attrs.tooltipAnimationClass);
      }
    }
  };
}])

.directive('uibTooltipPopup', function() {
  return {
    replace: true,
    scope: { content: '@', placement: '@', popupClass: '@', animation: '&', isOpen: '&' },
    templateUrl: 'uib/template/tooltip/tooltip-popup.html'
  };
})

.directive('uibTooltip', [ '$uibTooltip', function($uibTooltip) {
  return $uibTooltip('uibTooltip', 'tooltip', 'mouseenter');
}])

.directive('uibTooltipTemplatePopup', function() {
  return {
    replace: true,
    scope: { contentExp: '&', placement: '@', popupClass: '@', animation: '&', isOpen: '&',
      originScope: '&' },
    templateUrl: 'uib/template/tooltip/tooltip-template-popup.html'
  };
})

.directive('uibTooltipTemplate', ['$uibTooltip', function($uibTooltip) {
  return $uibTooltip('uibTooltipTemplate', 'tooltip', 'mouseenter', {
    useContentExp: true
  });
}])

.directive('uibTooltipHtmlPopup', function() {
  return {
    replace: true,
    scope: { contentExp: '&', placement: '@', popupClass: '@', animation: '&', isOpen: '&' },
    templateUrl: 'uib/template/tooltip/tooltip-html-popup.html'
  };
})

.directive('uibTooltipHtml', ['$uibTooltip', function($uibTooltip) {
  return $uibTooltip('uibTooltipHtml', 'tooltip', 'mouseenter', {
    useContentExp: true
  });
}]);

/**
 * The following features are still outstanding: popup delay, animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, and selector delegatation.
 */
angular.module('ui.bootstrap.popover', ['ui.bootstrap.tooltip'])

.directive('uibPopoverTemplatePopup', function() {
  return {
    replace: true,
    scope: { uibTitle: '@', contentExp: '&', placement: '@', popupClass: '@', animation: '&', isOpen: '&',
      originScope: '&' },
    templateUrl: 'uib/template/popover/popover-template.html'
  };
})

.directive('uibPopoverTemplate', ['$uibTooltip', function($uibTooltip) {
  return $uibTooltip('uibPopoverTemplate', 'popover', 'click', {
    useContentExp: true
  });
}])

.directive('uibPopoverHtmlPopup', function() {
  return {
    replace: true,
    scope: { contentExp: '&', uibTitle: '@', placement: '@', popupClass: '@', animation: '&', isOpen: '&' },
    templateUrl: 'uib/template/popover/popover-html.html'
  };
})

.directive('uibPopoverHtml', ['$uibTooltip', function($uibTooltip) {
  return $uibTooltip('uibPopoverHtml', 'popover', 'click', {
    useContentExp: true
  });
}])

.directive('uibPopoverPopup', function() {
  return {
    replace: true,
    scope: { uibTitle: '@', content: '@', placement: '@', popupClass: '@', animation: '&', isOpen: '&' },
    templateUrl: 'uib/template/popover/popover.html'
  };
})

.directive('uibPopover', ['$uibTooltip', function($uibTooltip) {
  return $uibTooltip('uibPopover', 'popover', 'click');
}]);

angular.module('ui.bootstrap.progressbar', [])

.constant('uibProgressConfig', {
  animate: true,
  max: 100
})

.controller('UibProgressController', ['$scope', '$attrs', 'uibProgressConfig', function($scope, $attrs, progressConfig) {
  var self = this,
      animate = angular.isDefined($attrs.animate) ? $scope.$parent.$eval($attrs.animate) : progressConfig.animate;

  this.bars = [];
  $scope.max = getMaxOrDefault();

  this.addBar = function(bar, element, attrs) {
    if (!animate) {
      element.css({'transition': 'none'});
    }

    this.bars.push(bar);

    bar.max = getMaxOrDefault();
    bar.title = attrs && angular.isDefined(attrs.title) ? attrs.title : 'progressbar';

    bar.$watch('value', function(value) {
      bar.recalculatePercentage();
    });

    bar.recalculatePercentage = function() {
      var totalPercentage = self.bars.reduce(function(total, bar) {
        bar.percent = +(100 * bar.value / bar.max).toFixed(2);
        return total + bar.percent;
      }, 0);

      if (totalPercentage > 100) {
        bar.percent -= totalPercentage - 100;
      }
    };

    bar.$on('$destroy', function() {
      element = null;
      self.removeBar(bar);
    });
  };

  this.removeBar = function(bar) {
    this.bars.splice(this.bars.indexOf(bar), 1);
    this.bars.forEach(function (bar) {
      bar.recalculatePercentage();
    });
  };

  //$attrs.$observe('maxParam', function(maxParam) {
  $scope.$watch('maxParam', function(maxParam) {
    self.bars.forEach(function(bar) {
      bar.max = getMaxOrDefault();
      bar.recalculatePercentage();
    });
  });

  function getMaxOrDefault () {
    return angular.isDefined($scope.maxParam) ? $scope.maxParam : progressConfig.max;
  }
}])

.directive('uibProgress', function() {
  return {
    replace: true,
    transclude: true,
    controller: 'UibProgressController',
    require: 'uibProgress',
    scope: {
      maxParam: '=?max'
    },
    templateUrl: 'uib/template/progressbar/progress.html'
  };
})

.directive('uibBar', function() {
  return {
    replace: true,
    transclude: true,
    require: '^uibProgress',
    scope: {
      value: '=',
      type: '@'
    },
    templateUrl: 'uib/template/progressbar/bar.html',
    link: function(scope, element, attrs, progressCtrl) {
      progressCtrl.addBar(scope, element, attrs);
    }
  };
})

.directive('uibProgressbar', function() {
  return {
    replace: true,
    transclude: true,
    controller: 'UibProgressController',
    scope: {
      value: '=',
      maxParam: '=?max',
      type: '@'
    },
    templateUrl: 'uib/template/progressbar/progressbar.html',
    link: function(scope, element, attrs, progressCtrl) {
      progressCtrl.addBar(scope, angular.element(element.children()[0]), {title: attrs.title});
    }
  };
});

angular.module('ui.bootstrap.rating', [])

.constant('uibRatingConfig', {
  max: 5,
  stateOn: null,
  stateOff: null,
  enableReset: true,
  titles : ['one', 'two', 'three', 'four', 'five']
})

.controller('UibRatingController', ['$scope', '$attrs', 'uibRatingConfig', function($scope, $attrs, ratingConfig) {
  var ngModelCtrl = { $setViewValue: angular.noop },
    self = this;

  this.init = function(ngModelCtrl_) {
    ngModelCtrl = ngModelCtrl_;
    ngModelCtrl.$render = this.render;

    ngModelCtrl.$formatters.push(function(value) {
      if (angular.isNumber(value) && value << 0 !== value) {
        value = Math.round(value);
      }

      return value;
    });

    this.stateOn = angular.isDefined($attrs.stateOn) ? $scope.$parent.$eval($attrs.stateOn) : ratingConfig.stateOn;
    this.stateOff = angular.isDefined($attrs.stateOff) ? $scope.$parent.$eval($attrs.stateOff) : ratingConfig.stateOff;
    this.enableReset = angular.isDefined($attrs.enableReset) ?
      $scope.$parent.$eval($attrs.enableReset) : ratingConfig.enableReset;
    var tmpTitles = angular.isDefined($attrs.titles) ? $scope.$parent.$eval($attrs.titles) : ratingConfig.titles;
    this.titles = angular.isArray(tmpTitles) && tmpTitles.length > 0 ?
      tmpTitles : ratingConfig.titles;

    var ratingStates = angular.isDefined($attrs.ratingStates) ?
      $scope.$parent.$eval($attrs.ratingStates) :
      new Array(angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : ratingConfig.max);
    $scope.range = this.buildTemplateObjects(ratingStates);
  };

  this.buildTemplateObjects = function(states) {
    for (var i = 0, n = states.length; i < n; i++) {
      states[i] = angular.extend({ index: i }, { stateOn: this.stateOn, stateOff: this.stateOff, title: this.getTitle(i) }, states[i]);
    }
    return states;
  };

  this.getTitle = function(index) {
    if (index >= this.titles.length) {
      return index + 1;
    }

    return this.titles[index];
  };

  $scope.rate = function(value) {
    if (!$scope.readonly && value >= 0 && value <= $scope.range.length) {
      var newViewValue = self.enableReset && ngModelCtrl.$viewValue === value ? 0 : value;
      ngModelCtrl.$setViewValue(newViewValue);
      ngModelCtrl.$render();
    }
  };

  $scope.enter = function(value) {
    if (!$scope.readonly) {
      $scope.value = value;
    }
    $scope.onHover({value: value});
  };

  $scope.reset = function() {
    $scope.value = ngModelCtrl.$viewValue;
    $scope.onLeave();
  };

  $scope.onKeydown = function(evt) {
    if (/(37|38|39|40)/.test(evt.which)) {
      evt.preventDefault();
      evt.stopPropagation();
      $scope.rate($scope.value + (evt.which === 38 || evt.which === 39 ? 1 : -1));
    }
  };

  this.render = function() {
    $scope.value = ngModelCtrl.$viewValue;
    $scope.title = self.getTitle($scope.value - 1);
  };
}])

.directive('uibRating', function() {
  return {
    require: ['uibRating', 'ngModel'],
    scope: {
      readonly: '=?readOnly',
      onHover: '&',
      onLeave: '&'
    },
    controller: 'UibRatingController',
    templateUrl: 'uib/template/rating/rating.html',
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var ratingCtrl = ctrls[0], ngModelCtrl = ctrls[1];
      ratingCtrl.init(ngModelCtrl);
    }
  };
});

angular.module('ui.bootstrap.tabs', [])

.controller('UibTabsetController', ['$scope', function ($scope) {
  var ctrl = this,
    oldIndex;
  ctrl.tabs = [];

  ctrl.select = function(index, evt) {
    if (!destroyed) {
      var previousIndex = findTabIndex(oldIndex);
      var previousSelected = ctrl.tabs[previousIndex];
      if (previousSelected) {
        previousSelected.tab.onDeselect({
          $event: evt
        });
        if (evt && evt.isDefaultPrevented()) {
          return;
        }
        previousSelected.tab.active = false;
      }

      var selected = ctrl.tabs[index];
      if (selected) {
        selected.tab.onSelect({
          $event: evt
        });
        selected.tab.active = true;
        ctrl.active = selected.index;
        oldIndex = selected.index;
      } else if (!selected && angular.isNumber(oldIndex)) {
        ctrl.active = null;
        oldIndex = null;
      }
    }
  };

  ctrl.addTab = function addTab(tab) {
    ctrl.tabs.push({
      tab: tab,
      index: tab.index
    });
    ctrl.tabs.sort(function(t1, t2) {
      if (t1.index > t2.index) {
        return 1;
      }

      if (t1.index < t2.index) {
        return -1;
      }

      return 0;
    });

    if (tab.index === ctrl.active || !angular.isNumber(ctrl.active) && ctrl.tabs.length === 1) {
      var newActiveIndex = findTabIndex(tab.index);
      ctrl.select(newActiveIndex);
    }
  };

  ctrl.removeTab = function removeTab(tab) {
    var index;
    for (var i = 0; i < ctrl.tabs.length; i++) {
      if (ctrl.tabs[i].tab === tab) {
        index = i;
        break;
      }
    }

    if (ctrl.tabs[index].index === ctrl.active) {
      var newActiveTabIndex = index === ctrl.tabs.length - 1 ?
        index - 1 : index + 1 % ctrl.tabs.length;
      ctrl.select(newActiveTabIndex);
    }

    ctrl.tabs.splice(index, 1);
  };

  $scope.$watch('tabset.active', function(val) {
    if (angular.isNumber(val) && val !== oldIndex) {
      ctrl.select(findTabIndex(val));
    }
  });

  var destroyed;
  $scope.$on('$destroy', function() {
    destroyed = true;
  });

  function findTabIndex(index) {
    for (var i = 0; i < ctrl.tabs.length; i++) {
      if (ctrl.tabs[i].index === index) {
        return i;
      }
    }
  }
}])

.directive('uibTabset', function() {
  return {
    transclude: true,
    replace: true,
    scope: {},
    bindToController: {
      active: '=?',
      type: '@'
    },
    controller: 'UibTabsetController',
    controllerAs: 'tabset',
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/tabs/tabset.html';
    },
    link: function(scope, element, attrs) {
      scope.vertical = angular.isDefined(attrs.vertical) ?
        scope.$parent.$eval(attrs.vertical) : false;
      scope.justified = angular.isDefined(attrs.justified) ?
        scope.$parent.$eval(attrs.justified) : false;
      if (angular.isUndefined(attrs.active)) {
        scope.active = 0;
      }
    }
  };
})

.directive('uibTab', ['$parse', function($parse) {
  return {
    require: '^uibTabset',
    replace: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/tabs/tab.html';
    },
    transclude: true,
    scope: {
      heading: '@',
      index: '=?',
      classes: '@?',
      onSelect: '&select', //This callback is called in contentHeadingTransclude
                          //once it inserts the tab's content into the dom
      onDeselect: '&deselect'
    },
    controller: function() {
      //Empty controller so other directives can require being 'under' a tab
    },
    controllerAs: 'tab',
    link: function(scope, elm, attrs, tabsetCtrl, transclude) {
      scope.disabled = false;
      if (attrs.disable) {
        scope.$parent.$watch($parse(attrs.disable), function(value) {
          scope.disabled = !! value;
        });
      }

      if (angular.isUndefined(attrs.index)) {
        if (tabsetCtrl.tabs && tabsetCtrl.tabs.length) {
          scope.index = Math.max.apply(null, tabsetCtrl.tabs.map(function(t) { return t.index; })) + 1;
        } else {
          scope.index = 0;
        }
      }

      if (angular.isUndefined(attrs.classes)) {
        scope.classes = '';
      }

      scope.select = function(evt) {
        if (!scope.disabled) {
          var index;
          for (var i = 0; i < tabsetCtrl.tabs.length; i++) {
            if (tabsetCtrl.tabs[i].tab === scope) {
              index = i;
              break;
            }
          }

          tabsetCtrl.select(index, evt);
        }
      };

      tabsetCtrl.addTab(scope);
      scope.$on('$destroy', function() {
        tabsetCtrl.removeTab(scope);
      });

      //We need to transclude later, once the content container is ready.
      //when this link happens, we're inside a tab heading.
      scope.$transcludeFn = transclude;
    }
  };
}])

.directive('uibTabHeadingTransclude', function() {
  return {
    restrict: 'A',
    require: '^uibTab',
    link: function(scope, elm) {
      scope.$watch('headingElement', function updateHeadingElement(heading) {
        if (heading) {
          elm.html('');
          elm.append(heading);
        }
      });
    }
  };
})

.directive('uibTabContentTransclude', function() {
  return {
    restrict: 'A',
    require: '^uibTabset',
    link: function(scope, elm, attrs) {
      var tab = scope.$eval(attrs.uibTabContentTransclude).tab;

      //Now our tab is ready to be transcluded: both the tab heading area
      //and the tab content area are loaded.  Transclude 'em both.
      tab.$transcludeFn(tab.$parent, function(contents) {
        angular.forEach(contents, function(node) {
          if (isTabHeading(node)) {
            //Let tabHeadingTransclude know.
            tab.headingElement = node;
          } else {
            elm.append(node);
          }
        });
      });
    }
  };

  function isTabHeading(node) {
    return node.tagName && (
      node.hasAttribute('uib-tab-heading') ||
      node.hasAttribute('data-uib-tab-heading') ||
      node.hasAttribute('x-uib-tab-heading') ||
      node.tagName.toLowerCase() === 'uib-tab-heading' ||
      node.tagName.toLowerCase() === 'data-uib-tab-heading' ||
      node.tagName.toLowerCase() === 'x-uib-tab-heading' ||
      node.tagName.toLowerCase() === 'uib:tab-heading'
    );
  }
});

angular.module('ui.bootstrap.timepicker', [])

.constant('uibTimepickerConfig', {
  hourStep: 1,
  minuteStep: 1,
  secondStep: 1,
  showMeridian: true,
  showSeconds: false,
  meridians: null,
  readonlyInput: false,
  mousewheel: true,
  arrowkeys: true,
  showSpinners: true,
  templateUrl: 'uib/template/timepicker/timepicker.html'
})

.controller('UibTimepickerController', ['$scope', '$element', '$attrs', '$parse', '$log', '$locale', 'uibTimepickerConfig', function($scope, $element, $attrs, $parse, $log, $locale, timepickerConfig) {
  var selected = new Date(),
    watchers = [],
    ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl
    meridians = angular.isDefined($attrs.meridians) ? $scope.$parent.$eval($attrs.meridians) : timepickerConfig.meridians || $locale.DATETIME_FORMATS.AMPMS,
    padHours = angular.isDefined($attrs.padHours) ? $scope.$parent.$eval($attrs.padHours) : true;

  $scope.tabindex = angular.isDefined($attrs.tabindex) ? $attrs.tabindex : 0;
  $element.removeAttr('tabindex');

  this.init = function(ngModelCtrl_, inputs) {
    ngModelCtrl = ngModelCtrl_;
    ngModelCtrl.$render = this.render;

    ngModelCtrl.$formatters.unshift(function(modelValue) {
      return modelValue ? new Date(modelValue) : null;
    });

    var hoursInputEl = inputs.eq(0),
        minutesInputEl = inputs.eq(1),
        secondsInputEl = inputs.eq(2);

    var mousewheel = angular.isDefined($attrs.mousewheel) ? $scope.$parent.$eval($attrs.mousewheel) : timepickerConfig.mousewheel;

    if (mousewheel) {
      this.setupMousewheelEvents(hoursInputEl, minutesInputEl, secondsInputEl);
    }

    var arrowkeys = angular.isDefined($attrs.arrowkeys) ? $scope.$parent.$eval($attrs.arrowkeys) : timepickerConfig.arrowkeys;
    if (arrowkeys) {
      this.setupArrowkeyEvents(hoursInputEl, minutesInputEl, secondsInputEl);
    }

    $scope.readonlyInput = angular.isDefined($attrs.readonlyInput) ? $scope.$parent.$eval($attrs.readonlyInput) : timepickerConfig.readonlyInput;
    this.setupInputEvents(hoursInputEl, minutesInputEl, secondsInputEl);
  };

  var hourStep = timepickerConfig.hourStep;
  if ($attrs.hourStep) {
    watchers.push($scope.$parent.$watch($parse($attrs.hourStep), function(value) {
      hourStep = +value;
    }));
  }

  var minuteStep = timepickerConfig.minuteStep;
  if ($attrs.minuteStep) {
    watchers.push($scope.$parent.$watch($parse($attrs.minuteStep), function(value) {
      minuteStep = +value;
    }));
  }

  var min;
  watchers.push($scope.$parent.$watch($parse($attrs.min), function(value) {
    var dt = new Date(value);
    min = isNaN(dt) ? undefined : dt;
  }));

  var max;
  watchers.push($scope.$parent.$watch($parse($attrs.max), function(value) {
    var dt = new Date(value);
    max = isNaN(dt) ? undefined : dt;
  }));

  var disabled = false;
  if ($attrs.ngDisabled) {
    watchers.push($scope.$parent.$watch($parse($attrs.ngDisabled), function(value) {
      disabled = value;
    }));
  }

  $scope.noIncrementHours = function() {
    var incrementedSelected = addMinutes(selected, hourStep * 60);
    return disabled || incrementedSelected > max ||
      incrementedSelected < selected && incrementedSelected < min;
  };

  $scope.noDecrementHours = function() {
    var decrementedSelected = addMinutes(selected, -hourStep * 60);
    return disabled || decrementedSelected < min ||
      decrementedSelected > selected && decrementedSelected > max;
  };

  $scope.noIncrementMinutes = function() {
    var incrementedSelected = addMinutes(selected, minuteStep);
    return disabled || incrementedSelected > max ||
      incrementedSelected < selected && incrementedSelected < min;
  };

  $scope.noDecrementMinutes = function() {
    var decrementedSelected = addMinutes(selected, -minuteStep);
    return disabled || decrementedSelected < min ||
      decrementedSelected > selected && decrementedSelected > max;
  };

  $scope.noIncrementSeconds = function() {
    var incrementedSelected = addSeconds(selected, secondStep);
    return disabled || incrementedSelected > max ||
      incrementedSelected < selected && incrementedSelected < min;
  };

  $scope.noDecrementSeconds = function() {
    var decrementedSelected = addSeconds(selected, -secondStep);
    return disabled || decrementedSelected < min ||
      decrementedSelected > selected && decrementedSelected > max;
  };

  $scope.noToggleMeridian = function() {
    if (selected.getHours() < 12) {
      return disabled || addMinutes(selected, 12 * 60) > max;
    }

    return disabled || addMinutes(selected, -12 * 60) < min;
  };

  var secondStep = timepickerConfig.secondStep;
  if ($attrs.secondStep) {
    watchers.push($scope.$parent.$watch($parse($attrs.secondStep), function(value) {
      secondStep = +value;
    }));
  }

  $scope.showSeconds = timepickerConfig.showSeconds;
  if ($attrs.showSeconds) {
    watchers.push($scope.$parent.$watch($parse($attrs.showSeconds), function(value) {
      $scope.showSeconds = !!value;
    }));
  }

  // 12H / 24H mode
  $scope.showMeridian = timepickerConfig.showMeridian;
  if ($attrs.showMeridian) {
    watchers.push($scope.$parent.$watch($parse($attrs.showMeridian), function(value) {
      $scope.showMeridian = !!value;

      if (ngModelCtrl.$error.time) {
        // Evaluate from template
        var hours = getHoursFromTemplate(), minutes = getMinutesFromTemplate();
        if (angular.isDefined(hours) && angular.isDefined(minutes)) {
          selected.setHours(hours);
          refresh();
        }
      } else {
        updateTemplate();
      }
    }));
  }

  // Get $scope.hours in 24H mode if valid
  function getHoursFromTemplate() {
    var hours = +$scope.hours;
    var valid = $scope.showMeridian ? hours > 0 && hours < 13 :
      hours >= 0 && hours < 24;
    if (!valid || $scope.hours === '') {
      return undefined;
    }

    if ($scope.showMeridian) {
      if (hours === 12) {
        hours = 0;
      }
      if ($scope.meridian === meridians[1]) {
        hours = hours + 12;
      }
    }
    return hours;
  }

  function getMinutesFromTemplate() {
    var minutes = +$scope.minutes;
    var valid = minutes >= 0 && minutes < 60;
    if (!valid || $scope.minutes === '') {
      return undefined;
    }
    return minutes;
  }

  function getSecondsFromTemplate() {
    var seconds = +$scope.seconds;
    return seconds >= 0 && seconds < 60 ? seconds : undefined;
  }

  function pad(value, noPad) {
    if (value === null) {
      return '';
    }

    return angular.isDefined(value) && value.toString().length < 2 && !noPad ?
      '0' + value : value.toString();
  }

  // Respond on mousewheel spin
  this.setupMousewheelEvents = function(hoursInputEl, minutesInputEl, secondsInputEl) {
    var isScrollingUp = function(e) {
      if (e.originalEvent) {
        e = e.originalEvent;
      }
      //pick correct delta variable depending on event
      var delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
      return e.detail || delta > 0;
    };

    hoursInputEl.bind('mousewheel wheel', function(e) {
      if (!disabled) {
        $scope.$apply(isScrollingUp(e) ? $scope.incrementHours() : $scope.decrementHours());
      }
      e.preventDefault();
    });

    minutesInputEl.bind('mousewheel wheel', function(e) {
      if (!disabled) {
        $scope.$apply(isScrollingUp(e) ? $scope.incrementMinutes() : $scope.decrementMinutes());
      }
      e.preventDefault();
    });

     secondsInputEl.bind('mousewheel wheel', function(e) {
      if (!disabled) {
        $scope.$apply(isScrollingUp(e) ? $scope.incrementSeconds() : $scope.decrementSeconds());
      }
      e.preventDefault();
    });
  };

  // Respond on up/down arrowkeys
  this.setupArrowkeyEvents = function(hoursInputEl, minutesInputEl, secondsInputEl) {
    hoursInputEl.bind('keydown', function(e) {
      if (!disabled) {
        if (e.which === 38) { // up
          e.preventDefault();
          $scope.incrementHours();
          $scope.$apply();
        } else if (e.which === 40) { // down
          e.preventDefault();
          $scope.decrementHours();
          $scope.$apply();
        }
      }
    });

    minutesInputEl.bind('keydown', function(e) {
      if (!disabled) {
        if (e.which === 38) { // up
          e.preventDefault();
          $scope.incrementMinutes();
          $scope.$apply();
        } else if (e.which === 40) { // down
          e.preventDefault();
          $scope.decrementMinutes();
          $scope.$apply();
        }
      }
    });

    secondsInputEl.bind('keydown', function(e) {
      if (!disabled) {
        if (e.which === 38) { // up
          e.preventDefault();
          $scope.incrementSeconds();
          $scope.$apply();
        } else if (e.which === 40) { // down
          e.preventDefault();
          $scope.decrementSeconds();
          $scope.$apply();
        }
      }
    });
  };

  this.setupInputEvents = function(hoursInputEl, minutesInputEl, secondsInputEl) {
    if ($scope.readonlyInput) {
      $scope.updateHours = angular.noop;
      $scope.updateMinutes = angular.noop;
      $scope.updateSeconds = angular.noop;
      return;
    }

    var invalidate = function(invalidHours, invalidMinutes, invalidSeconds) {
      ngModelCtrl.$setViewValue(null);
      ngModelCtrl.$setValidity('time', false);
      if (angular.isDefined(invalidHours)) {
        $scope.invalidHours = invalidHours;
      }

      if (angular.isDefined(invalidMinutes)) {
        $scope.invalidMinutes = invalidMinutes;
      }

      if (angular.isDefined(invalidSeconds)) {
        $scope.invalidSeconds = invalidSeconds;
      }
    };

    $scope.updateHours = function() {
      var hours = getHoursFromTemplate(),
        minutes = getMinutesFromTemplate();

      ngModelCtrl.$setDirty();

      if (angular.isDefined(hours) && angular.isDefined(minutes)) {
        selected.setHours(hours);
        selected.setMinutes(minutes);
        if (selected < min || selected > max) {
          invalidate(true);
        } else {
          refresh('h');
        }
      } else {
        invalidate(true);
      }
    };

    hoursInputEl.bind('blur', function(e) {
      ngModelCtrl.$setTouched();
      if (modelIsEmpty()) {
        makeValid();
      } else if ($scope.hours === null || $scope.hours === '') {
        invalidate(true);
      } else if (!$scope.invalidHours && $scope.hours < 10) {
        $scope.$apply(function() {
          $scope.hours = pad($scope.hours, !padHours);
        });
      }
    });

    $scope.updateMinutes = function() {
      var minutes = getMinutesFromTemplate(),
        hours = getHoursFromTemplate();

      ngModelCtrl.$setDirty();

      if (angular.isDefined(minutes) && angular.isDefined(hours)) {
        selected.setHours(hours);
        selected.setMinutes(minutes);
        if (selected < min || selected > max) {
          invalidate(undefined, true);
        } else {
          refresh('m');
        }
      } else {
        invalidate(undefined, true);
      }
    };

    minutesInputEl.bind('blur', function(e) {
      ngModelCtrl.$setTouched();
      if (modelIsEmpty()) {
        makeValid();
      } else if ($scope.minutes === null) {
        invalidate(undefined, true);
      } else if (!$scope.invalidMinutes && $scope.minutes < 10) {
        $scope.$apply(function() {
          $scope.minutes = pad($scope.minutes);
        });
      }
    });

    $scope.updateSeconds = function() {
      var seconds = getSecondsFromTemplate();

      ngModelCtrl.$setDirty();

      if (angular.isDefined(seconds)) {
        selected.setSeconds(seconds);
        refresh('s');
      } else {
        invalidate(undefined, undefined, true);
      }
    };

    secondsInputEl.bind('blur', function(e) {
      if (modelIsEmpty()) {
        makeValid();
      } else if (!$scope.invalidSeconds && $scope.seconds < 10) {
        $scope.$apply( function() {
          $scope.seconds = pad($scope.seconds);
        });
      }
    });

  };

  this.render = function() {
    var date = ngModelCtrl.$viewValue;

    if (isNaN(date)) {
      ngModelCtrl.$setValidity('time', false);
      $log.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
    } else {
      if (date) {
        selected = date;
      }

      if (selected < min || selected > max) {
        ngModelCtrl.$setValidity('time', false);
        $scope.invalidHours = true;
        $scope.invalidMinutes = true;
      } else {
        makeValid();
      }
      updateTemplate();
    }
  };

  // Call internally when we know that model is valid.
  function refresh(keyboardChange) {
    makeValid();
    ngModelCtrl.$setViewValue(new Date(selected));
    updateTemplate(keyboardChange);
  }

  function makeValid() {
    ngModelCtrl.$setValidity('time', true);
    $scope.invalidHours = false;
    $scope.invalidMinutes = false;
    $scope.invalidSeconds = false;
  }

  function updateTemplate(keyboardChange) {
    if (!ngModelCtrl.$modelValue) {
      $scope.hours = null;
      $scope.minutes = null;
      $scope.seconds = null;
      $scope.meridian = meridians[0];
    } else {
      var hours = selected.getHours(),
        minutes = selected.getMinutes(),
        seconds = selected.getSeconds();

      if ($scope.showMeridian) {
        hours = hours === 0 || hours === 12 ? 12 : hours % 12; // Convert 24 to 12 hour system
      }

      $scope.hours = keyboardChange === 'h' ? hours : pad(hours, !padHours);
      if (keyboardChange !== 'm') {
        $scope.minutes = pad(minutes);
      }
      $scope.meridian = selected.getHours() < 12 ? meridians[0] : meridians[1];

      if (keyboardChange !== 's') {
        $scope.seconds = pad(seconds);
      }
      $scope.meridian = selected.getHours() < 12 ? meridians[0] : meridians[1];
    }
  }

  function addSecondsToSelected(seconds) {
    selected = addSeconds(selected, seconds);
    refresh();
  }

  function addMinutes(selected, minutes) {
    return addSeconds(selected, minutes*60);
  }

  function addSeconds(date, seconds) {
    var dt = new Date(date.getTime() + seconds * 1000);
    var newDate = new Date(date);
    newDate.setHours(dt.getHours(), dt.getMinutes(), dt.getSeconds());
    return newDate;
  }

  function modelIsEmpty() {
    return ($scope.hours === null || $scope.hours === '') &&
      ($scope.minutes === null || $scope.minutes === '') &&
      (!$scope.showSeconds || $scope.showSeconds && ($scope.seconds === null || $scope.seconds === ''));
  }

  $scope.showSpinners = angular.isDefined($attrs.showSpinners) ?
    $scope.$parent.$eval($attrs.showSpinners) : timepickerConfig.showSpinners;

  $scope.incrementHours = function() {
    if (!$scope.noIncrementHours()) {
      addSecondsToSelected(hourStep * 60 * 60);
    }
  };

  $scope.decrementHours = function() {
    if (!$scope.noDecrementHours()) {
      addSecondsToSelected(-hourStep * 60 * 60);
    }
  };

  $scope.incrementMinutes = function() {
    if (!$scope.noIncrementMinutes()) {
      addSecondsToSelected(minuteStep * 60);
    }
  };

  $scope.decrementMinutes = function() {
    if (!$scope.noDecrementMinutes()) {
      addSecondsToSelected(-minuteStep * 60);
    }
  };

  $scope.incrementSeconds = function() {
    if (!$scope.noIncrementSeconds()) {
      addSecondsToSelected(secondStep);
    }
  };

  $scope.decrementSeconds = function() {
    if (!$scope.noDecrementSeconds()) {
      addSecondsToSelected(-secondStep);
    }
  };

  $scope.toggleMeridian = function() {
    var minutes = getMinutesFromTemplate(),
        hours = getHoursFromTemplate();

    if (!$scope.noToggleMeridian()) {
      if (angular.isDefined(minutes) && angular.isDefined(hours)) {
        addSecondsToSelected(12 * 60 * (selected.getHours() < 12 ? 60 : -60));
      } else {
        $scope.meridian = $scope.meridian === meridians[0] ? meridians[1] : meridians[0];
      }
    }
  };

  $scope.blur = function() {
    ngModelCtrl.$setTouched();
  };

  $scope.$on('$destroy', function() {
    while (watchers.length) {
      watchers.shift()();
    }
  });
}])

.directive('uibTimepicker', ['uibTimepickerConfig', function(uibTimepickerConfig) {
  return {
    require: ['uibTimepicker', '?^ngModel'],
    controller: 'UibTimepickerController',
    controllerAs: 'timepicker',
    replace: true,
    scope: {},
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || uibTimepickerConfig.templateUrl;
    },
    link: function(scope, element, attrs, ctrls) {
      var timepickerCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if (ngModelCtrl) {
        timepickerCtrl.init(ngModelCtrl, element.find('input'));
      }
    }
  };
}]);

angular.module('ui.bootstrap.typeahead', ['ui.bootstrap.debounce', 'ui.bootstrap.position'])

/**
 * A helper service that can parse typeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */
  .factory('uibTypeaheadParser', ['$parse', function($parse) {
    //                      00000111000000000000022200000000000000003333333333333330000000000044000
    var TYPEAHEAD_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;
    return {
      parse: function(input) {
        var match = input.match(TYPEAHEAD_REGEXP);
        if (!match) {
          throw new Error(
            'Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_"' +
              ' but got "' + input + '".');
        }

        return {
          itemName: match[3],
          source: $parse(match[4]),
          viewMapper: $parse(match[2] || match[1]),
          modelMapper: $parse(match[1])
        };
      }
    };
  }])

  .controller('UibTypeaheadController', ['$scope', '$element', '$attrs', '$compile', '$parse', '$q', '$timeout', '$document', '$window', '$rootScope', '$$debounce', '$uibPosition', 'uibTypeaheadParser',
    function(originalScope, element, attrs, $compile, $parse, $q, $timeout, $document, $window, $rootScope, $$debounce, $position, typeaheadParser) {
    var HOT_KEYS = [9, 13, 27, 38, 40];
    var eventDebounceTime = 200;
    var modelCtrl, ngModelOptions;
    //SUPPORTED ATTRIBUTES (OPTIONS)

    //minimal no of characters that needs to be entered before typeahead kicks-in
    var minLength = originalScope.$eval(attrs.typeaheadMinLength);
    if (!minLength && minLength !== 0) {
      minLength = 1;
    }

    originalScope.$watch(attrs.typeaheadMinLength, function (newVal) {
        minLength = !newVal && newVal !== 0 ? 1 : newVal;
    });
    
    //minimal wait time after last character typed before typeahead kicks-in
    var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;

    //should it restrict model values to the ones selected from the popup only?
    var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;
    originalScope.$watch(attrs.typeaheadEditable, function (newVal) {
      isEditable = newVal !== false;
    });

    //binding to a variable that indicates if matches are being retrieved asynchronously
    var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;

    //a callback executed when a match is selected
    var onSelectCallback = $parse(attrs.typeaheadOnSelect);

    //should it select highlighted popup value when losing focus?
    var isSelectOnBlur = angular.isDefined(attrs.typeaheadSelectOnBlur) ? originalScope.$eval(attrs.typeaheadSelectOnBlur) : false;

    //binding to a variable that indicates if there were no results after the query is completed
    var isNoResultsSetter = $parse(attrs.typeaheadNoResults).assign || angular.noop;

    var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;

    var appendToBody = attrs.typeaheadAppendToBody ? originalScope.$eval(attrs.typeaheadAppendToBody) : false;

    var appendTo = attrs.typeaheadAppendTo ?
      originalScope.$eval(attrs.typeaheadAppendTo) : null;

    var focusFirst = originalScope.$eval(attrs.typeaheadFocusFirst) !== false;

    //If input matches an item of the list exactly, select it automatically
    var selectOnExact = attrs.typeaheadSelectOnExact ? originalScope.$eval(attrs.typeaheadSelectOnExact) : false;

    //binding to a variable that indicates if dropdown is open
    var isOpenSetter = $parse(attrs.typeaheadIsOpen).assign || angular.noop;

    var showHint = originalScope.$eval(attrs.typeaheadShowHint) || false;

    //INTERNAL VARIABLES

    //model setter executed upon match selection
    var parsedModel = $parse(attrs.ngModel);
    var invokeModelSetter = $parse(attrs.ngModel + '($$$p)');
    var $setModelValue = function(scope, newValue) {
      if (angular.isFunction(parsedModel(originalScope)) &&
        ngModelOptions && ngModelOptions.$options && ngModelOptions.$options.getterSetter) {
        return invokeModelSetter(scope, {$$$p: newValue});
      }

      return parsedModel.assign(scope, newValue);
    };

    //expressions used by typeahead
    var parserResult = typeaheadParser.parse(attrs.uibTypeahead);

    var hasFocus;

    //Used to avoid bug in iOS webview where iOS keyboard does not fire
    //mousedown & mouseup events
    //Issue #3699
    var selected;

    //create a child scope for the typeahead directive so we are not polluting original scope
    //with typeahead-specific data (matches, query etc.)
    var scope = originalScope.$new();
    var offDestroy = originalScope.$on('$destroy', function() {
      scope.$destroy();
    });
    scope.$on('$destroy', offDestroy);

    // WAI-ARIA
    var popupId = 'typeahead-' + scope.$id + '-' + Math.floor(Math.random() * 10000);
    element.attr({
      'aria-autocomplete': 'list',
      'aria-expanded': false,
      'aria-owns': popupId
    });

    var inputsContainer, hintInputElem;
    //add read-only input to show hint
    if (showHint) {
      inputsContainer = angular.element('<div></div>');
      inputsContainer.css('position', 'relative');
      element.after(inputsContainer);
      hintInputElem = element.clone();
      hintInputElem.attr('placeholder', '');
      hintInputElem.attr('tabindex', '-1');
      hintInputElem.val('');
      hintInputElem.css({
        'position': 'absolute',
        'top': '0px',
        'left': '0px',
        'border-color': 'transparent',
        'box-shadow': 'none',
        'opacity': 1,
        'background': 'none 0% 0% / auto repeat scroll padding-box border-box rgb(255, 255, 255)',
        'color': '#999'
      });
      element.css({
        'position': 'relative',
        'vertical-align': 'top',
        'background-color': 'transparent'
      });
      inputsContainer.append(hintInputElem);
      hintInputElem.after(element);
    }

    //pop-up element used to display matches
    var popUpEl = angular.element('<div uib-typeahead-popup></div>');
    popUpEl.attr({
      id: popupId,
      matches: 'matches',
      active: 'activeIdx',
      select: 'select(activeIdx, evt)',
      'move-in-progress': 'moveInProgress',
      query: 'query',
      position: 'position',
      'assign-is-open': 'assignIsOpen(isOpen)',
      debounce: 'debounceUpdate'
    });
    //custom item template
    if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
      popUpEl.attr('template-url', attrs.typeaheadTemplateUrl);
    }

    if (angular.isDefined(attrs.typeaheadPopupTemplateUrl)) {
      popUpEl.attr('popup-template-url', attrs.typeaheadPopupTemplateUrl);
    }

    var resetHint = function() {
      if (showHint) {
        hintInputElem.val('');
      }
    };

    var resetMatches = function() {
      scope.matches = [];
      scope.activeIdx = -1;
      element.attr('aria-expanded', false);
      resetHint();
    };

    var getMatchId = function(index) {
      return popupId + '-option-' + index;
    };

    // Indicate that the specified match is the active (pre-selected) item in the list owned by this typeahead.
    // This attribute is added or removed automatically when the `activeIdx` changes.
    scope.$watch('activeIdx', function(index) {
      if (index < 0) {
        element.removeAttr('aria-activedescendant');
      } else {
        element.attr('aria-activedescendant', getMatchId(index));
      }
    });

    var inputIsExactMatch = function(inputValue, index) {
      if (scope.matches.length > index && inputValue) {
        return inputValue.toUpperCase() === scope.matches[index].label.toUpperCase();
      }

      return false;
    };

    var getMatchesAsync = function(inputValue, evt) {
      var locals = {$viewValue: inputValue};
      isLoadingSetter(originalScope, true);
      isNoResultsSetter(originalScope, false);
      $q.when(parserResult.source(originalScope, locals)).then(function(matches) {
        //it might happen that several async queries were in progress if a user were typing fast
        //but we are interested only in responses that correspond to the current view value
        var onCurrentRequest = inputValue === modelCtrl.$viewValue;
        if (onCurrentRequest && hasFocus) {
          if (matches && matches.length > 0) {
            scope.activeIdx = focusFirst ? 0 : -1;
            isNoResultsSetter(originalScope, false);
            scope.matches.length = 0;

            //transform labels
            for (var i = 0; i < matches.length; i++) {
              locals[parserResult.itemName] = matches[i];
              scope.matches.push({
                id: getMatchId(i),
                label: parserResult.viewMapper(scope, locals),
                model: matches[i]
              });
            }

            scope.query = inputValue;
            //position pop-up with matches - we need to re-calculate its position each time we are opening a window
            //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
            //due to other elements being rendered
            recalculatePosition();

            element.attr('aria-expanded', true);

            //Select the single remaining option if user input matches
            if (selectOnExact && scope.matches.length === 1 && inputIsExactMatch(inputValue, 0)) {
              if (angular.isNumber(scope.debounceUpdate) || angular.isObject(scope.debounceUpdate)) {
                $$debounce(function() {
                  scope.select(0, evt);
                }, angular.isNumber(scope.debounceUpdate) ? scope.debounceUpdate : scope.debounceUpdate['default']);
              } else {
                scope.select(0, evt);
              }
            }

            if (showHint) {
              var firstLabel = scope.matches[0].label;
              if (angular.isString(inputValue) &&
                inputValue.length > 0 &&
                firstLabel.slice(0, inputValue.length).toUpperCase() === inputValue.toUpperCase()) {
                hintInputElem.val(inputValue + firstLabel.slice(inputValue.length));
              } else {
                hintInputElem.val('');
              }
            }
          } else {
            resetMatches();
            isNoResultsSetter(originalScope, true);
          }
        }
        if (onCurrentRequest) {
          isLoadingSetter(originalScope, false);
        }
      }, function() {
        resetMatches();
        isLoadingSetter(originalScope, false);
        isNoResultsSetter(originalScope, true);
      });
    };

    // bind events only if appendToBody params exist - performance feature
    if (appendToBody) {
      angular.element($window).on('resize', fireRecalculating);
      $document.find('body').on('scroll', fireRecalculating);
    }

    // Declare the debounced function outside recalculating for
    // proper debouncing
    var debouncedRecalculate = $$debounce(function() {
      // if popup is visible
      if (scope.matches.length) {
        recalculatePosition();
      }

      scope.moveInProgress = false;
    }, eventDebounceTime);

    // Default progress type
    scope.moveInProgress = false;

    function fireRecalculating() {
      if (!scope.moveInProgress) {
        scope.moveInProgress = true;
        scope.$digest();
      }

      debouncedRecalculate();
    }

    // recalculate actual position and set new values to scope
    // after digest loop is popup in right position
    function recalculatePosition() {
      scope.position = appendToBody ? $position.offset(element) : $position.position(element);
      scope.position.top += element.prop('offsetHeight');
    }

    //we need to propagate user's query so we can higlight matches
    scope.query = undefined;

    //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later
    var timeoutPromise;

    var scheduleSearchWithTimeout = function(inputValue) {
      timeoutPromise = $timeout(function() {
        getMatchesAsync(inputValue);
      }, waitTime);
    };

    var cancelPreviousTimeout = function() {
      if (timeoutPromise) {
        $timeout.cancel(timeoutPromise);
      }
    };

    resetMatches();

    scope.assignIsOpen = function (isOpen) {
      isOpenSetter(originalScope, isOpen);
    };

    scope.select = function(activeIdx, evt) {
      //called from within the $digest() cycle
      var locals = {};
      var model, item;

      selected = true;
      locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
      model = parserResult.modelMapper(originalScope, locals);
      $setModelValue(originalScope, model);
      modelCtrl.$setValidity('editable', true);
      modelCtrl.$setValidity('parse', true);

      onSelectCallback(originalScope, {
        $item: item,
        $model: model,
        $label: parserResult.viewMapper(originalScope, locals),
        $event: evt
      });

      resetMatches();

      //return focus to the input element if a match was selected via a mouse click event
      // use timeout to avoid $rootScope:inprog error
      if (scope.$eval(attrs.typeaheadFocusOnSelect) !== false) {
        $timeout(function() { element[0].focus(); }, 0, false);
      }
    };

    //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
    element.on('keydown', function(evt) {
      //typeahead is open and an "interesting" key was pressed
      if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
        return;
      }

      /**
       * if there's nothing selected (i.e. focusFirst) and enter or tab is hit
       * or
       * shift + tab is pressed to bring focus to the previous element
       * then clear the results
       */
      if (scope.activeIdx === -1 && (evt.which === 9 || evt.which === 13) || evt.which === 9 && !!evt.shiftKey) {
        resetMatches();
        scope.$digest();
        return;
      }

      evt.preventDefault();
      var target;
      switch (evt.which) {
        case 9:
        case 13:
          scope.$apply(function () {
            if (angular.isNumber(scope.debounceUpdate) || angular.isObject(scope.debounceUpdate)) {
              $$debounce(function() {
                scope.select(scope.activeIdx, evt);
              }, angular.isNumber(scope.debounceUpdate) ? scope.debounceUpdate : scope.debounceUpdate['default']);
            } else {
              scope.select(scope.activeIdx, evt);
            }
          });
          break;
        case 27:
          evt.stopPropagation();

          resetMatches();
          originalScope.$digest();
          break;
        case 38:
          scope.activeIdx = (scope.activeIdx > 0 ? scope.activeIdx : scope.matches.length) - 1;
          scope.$digest();
          target = popUpEl.find('li')[scope.activeIdx];
          target.parentNode.scrollTop = target.offsetTop;
          break;
        case 40:
          scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
          scope.$digest();
          target = popUpEl.find('li')[scope.activeIdx];
          target.parentNode.scrollTop = target.offsetTop;
          break;
      }
    });

    element.bind('focus', function (evt) {
      hasFocus = true;
      if (minLength === 0 && !modelCtrl.$viewValue) {
        $timeout(function() {
          getMatchesAsync(modelCtrl.$viewValue, evt);
        }, 0);
      }
    });

    element.bind('blur', function(evt) {
      if (isSelectOnBlur && scope.matches.length && scope.activeIdx !== -1 && !selected) {
        selected = true;
        scope.$apply(function() {
          if (angular.isObject(scope.debounceUpdate) && angular.isNumber(scope.debounceUpdate.blur)) {
            $$debounce(function() {
              scope.select(scope.activeIdx, evt);
            }, scope.debounceUpdate.blur);
          } else {
            scope.select(scope.activeIdx, evt);
          }
        });
      }
      if (!isEditable && modelCtrl.$error.editable) {
        modelCtrl.$setViewValue();
        // Reset validity as we are clearing
        modelCtrl.$setValidity('editable', true);
        modelCtrl.$setValidity('parse', true);
        element.val('');
      }
      hasFocus = false;
      selected = false;
    });

    // Keep reference to click handler to unbind it.
    var dismissClickHandler = function(evt) {
      // Issue #3973
      // Firefox treats right click as a click on document
      if (element[0] !== evt.target && evt.which !== 3 && scope.matches.length !== 0) {
        resetMatches();
        if (!$rootScope.$$phase) {
          originalScope.$digest();
        }
      }
    };

    $document.on('click', dismissClickHandler);

    originalScope.$on('$destroy', function() {
      $document.off('click', dismissClickHandler);
      if (appendToBody || appendTo) {
        $popup.remove();
      }

      if (appendToBody) {
        angular.element($window).off('resize', fireRecalculating);
        $document.find('body').off('scroll', fireRecalculating);
      }
      // Prevent jQuery cache memory leak
      popUpEl.remove();

      if (showHint) {
          inputsContainer.remove();
      }
    });

    var $popup = $compile(popUpEl)(scope);

    if (appendToBody) {
      $document.find('body').append($popup);
    } else if (appendTo) {
      angular.element(appendTo).eq(0).append($popup);
    } else {
      element.after($popup);
    }

    this.init = function(_modelCtrl, _ngModelOptions) {
      modelCtrl = _modelCtrl;
      ngModelOptions = _ngModelOptions;

      scope.debounceUpdate = modelCtrl.$options && $parse(modelCtrl.$options.debounce)(originalScope);

      //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
      //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
      modelCtrl.$parsers.unshift(function(inputValue) {
        hasFocus = true;

        if (minLength === 0 || inputValue && inputValue.length >= minLength) {
          if (waitTime > 0) {
            cancelPreviousTimeout();
            scheduleSearchWithTimeout(inputValue);
          } else {
            getMatchesAsync(inputValue);
          }
        } else {
          isLoadingSetter(originalScope, false);
          cancelPreviousTimeout();
          resetMatches();
        }

        if (isEditable) {
          return inputValue;
        }

        if (!inputValue) {
          // Reset in case user had typed something previously.
          modelCtrl.$setValidity('editable', true);
          return null;
        }

        modelCtrl.$setValidity('editable', false);
        return undefined;
      });

      modelCtrl.$formatters.push(function(modelValue) {
        var candidateViewValue, emptyViewValue;
        var locals = {};

        // The validity may be set to false via $parsers (see above) if
        // the model is restricted to selected values. If the model
        // is set manually it is considered to be valid.
        if (!isEditable) {
          modelCtrl.$setValidity('editable', true);
        }

        if (inputFormatter) {
          locals.$model = modelValue;
          return inputFormatter(originalScope, locals);
        }

        //it might happen that we don't have enough info to properly render input value
        //we need to check for this situation and simply return model value if we can't apply custom formatting
        locals[parserResult.itemName] = modelValue;
        candidateViewValue = parserResult.viewMapper(originalScope, locals);
        locals[parserResult.itemName] = undefined;
        emptyViewValue = parserResult.viewMapper(originalScope, locals);

        return candidateViewValue !== emptyViewValue ? candidateViewValue : modelValue;
      });
    };
  }])

  .directive('uibTypeahead', function() {
    return {
      controller: 'UibTypeaheadController',
      require: ['ngModel', '^?ngModelOptions', 'uibTypeahead'],
      link: function(originalScope, element, attrs, ctrls) {
        ctrls[2].init(ctrls[0], ctrls[1]);
      }
    };
  })

  .directive('uibTypeaheadPopup', ['$$debounce', function($$debounce) {
    return {
      scope: {
        matches: '=',
        query: '=',
        active: '=',
        position: '&',
        moveInProgress: '=',
        select: '&',
        assignIsOpen: '&',
        debounce: '&'
      },
      replace: true,
      templateUrl: function(element, attrs) {
        return attrs.popupTemplateUrl || 'uib/template/typeahead/typeahead-popup.html';
      },
      link: function(scope, element, attrs) {
        scope.templateUrl = attrs.templateUrl;

        scope.isOpen = function() {
          var isDropdownOpen = scope.matches.length > 0;
          scope.assignIsOpen({ isOpen: isDropdownOpen });
          return isDropdownOpen;
        };

        scope.isActive = function(matchIdx) {
          return scope.active === matchIdx;
        };

        scope.selectActive = function(matchIdx) {
          scope.active = matchIdx;
        };

        scope.selectMatch = function(activeIdx, evt) {
          var debounce = scope.debounce();
          if (angular.isNumber(debounce) || angular.isObject(debounce)) {
            $$debounce(function() {
              scope.select({activeIdx: activeIdx, evt: evt});
            }, angular.isNumber(debounce) ? debounce : debounce['default']);
          } else {
            scope.select({activeIdx: activeIdx, evt: evt});
          }
        };
      }
    };
  }])

  .directive('uibTypeaheadMatch', ['$templateRequest', '$compile', '$parse', function($templateRequest, $compile, $parse) {
    return {
      scope: {
        index: '=',
        match: '=',
        query: '='
      },
      link: function(scope, element, attrs) {
        var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'uib/template/typeahead/typeahead-match.html';
        $templateRequest(tplUrl).then(function(tplContent) {
          var tplEl = angular.element(tplContent.trim());
          element.replaceWith(tplEl);
          $compile(tplEl)(scope);
        });
      }
    };
  }])

  .filter('uibTypeaheadHighlight', ['$sce', '$injector', '$log', function($sce, $injector, $log) {
    var isSanitizePresent;
    isSanitizePresent = $injector.has('$sanitize');

    function escapeRegexp(queryToEscape) {
      // Regex: capture the whole query string and replace it with the string that will be used to match
      // the results, for example if the capture is "a" the result will be \a
      return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
    }

    function containsHtml(matchItem) {
      return /<.*>/g.test(matchItem);
    }

    return function(matchItem, query) {
      if (!isSanitizePresent && containsHtml(matchItem)) {
        $log.warn('Unsafe use of typeahead please use ngSanitize'); // Warn the user about the danger
      }
      matchItem = query ? ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem; // Replaces the capture string with a the same string inside of a "strong" tag
      if (!isSanitizePresent) {
        matchItem = $sce.trustAsHtml(matchItem); // If $sanitize is not present we pack the string in a $sce object for the ng-bind-html directive
      }
      return matchItem;
    };
  }]);

angular.module("uib/template/accordion/accordion-group.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/accordion/accordion-group.html",
    "<div class=\"panel\" ng-class=\"panelClass || 'panel-default'\">\n" +
    "  <div role=\"tab\" id=\"{{::headingId}}\" aria-selected=\"{{isOpen}}\" class=\"panel-heading\" ng-keypress=\"toggleOpen($event)\">\n" +
    "    <h4 class=\"panel-title\">\n" +
    "      <a role=\"button\" data-toggle=\"collapse\" href aria-expanded=\"{{isOpen}}\" aria-controls=\"{{::panelId}}\" tabindex=\"0\" class=\"accordion-toggle\" ng-click=\"toggleOpen()\" uib-accordion-transclude=\"heading\"><span uib-accordion-header ng-class=\"{'text-muted': isDisabled}\">{{heading}}</span></a>\n" +
    "    </h4>\n" +
    "  </div>\n" +
    "  <div id=\"{{::panelId}}\" aria-labelledby=\"{{::headingId}}\" aria-hidden=\"{{!isOpen}}\" role=\"tabpanel\" class=\"panel-collapse collapse\" uib-collapse=\"!isOpen\">\n" +
    "    <div class=\"panel-body\" ng-transclude></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/accordion/accordion.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/accordion/accordion.html",
    "<div role=\"tablist\" class=\"panel-group\" ng-transclude></div>");
}]);

angular.module("uib/template/alert/alert.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/alert/alert.html",
    "<div class=\"alert\" ng-class=\"['alert-' + (type || 'warning'), closeable ? 'alert-dismissible' : null]\" role=\"alert\">\n" +
    "    <button ng-show=\"closeable\" type=\"button\" class=\"close\" ng-click=\"close({$event: $event})\">\n" +
    "        <span aria-hidden=\"true\">&times;</span>\n" +
    "        <span class=\"sr-only\">Close</span>\n" +
    "    </button>\n" +
    "    <div ng-transclude></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/carousel/carousel.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/carousel/carousel.html",
    "<div ng-mouseenter=\"pause()\" ng-mouseleave=\"play()\" class=\"carousel\" ng-swipe-right=\"prev()\" ng-swipe-left=\"next()\">\n" +
    "  <div class=\"carousel-inner\" ng-transclude></div>\n" +
    "  <a role=\"button\" href class=\"left carousel-control\" ng-click=\"prev()\" ng-class=\"{ disabled: isPrevDisabled() }\" ng-show=\"slides.length > 1\">\n" +
    "    <span aria-hidden=\"true\" class=\"glyphicon glyphicon-chevron-left\"></span>\n" +
    "    <span class=\"sr-only\">previous</span>\n" +
    "  </a>\n" +
    "  <a role=\"button\" href class=\"right carousel-control\" ng-click=\"next()\" ng-class=\"{ disabled: isNextDisabled() }\" ng-show=\"slides.length > 1\">\n" +
    "    <span aria-hidden=\"true\" class=\"glyphicon glyphicon-chevron-right\"></span>\n" +
    "    <span class=\"sr-only\">next</span>\n" +
    "  </a>\n" +
    "  <ol class=\"carousel-indicators\" ng-show=\"slides.length > 1\">\n" +
    "    <li ng-repeat=\"slide in slides | orderBy:indexOfSlide track by $index\" ng-class=\"{ active: isActive(slide) }\" ng-click=\"select(slide)\">\n" +
    "      <span class=\"sr-only\">slide {{ $index + 1 }} of {{ slides.length }}<span ng-if=\"isActive(slide)\">, currently active</span></span>\n" +
    "    </li>\n" +
    "  </ol>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/carousel/slide.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/carousel/slide.html",
    "<div ng-class=\"{\n" +
    "    'active': active\n" +
    "  }\" class=\"item text-center\" ng-transclude></div>\n" +
    "");
}]);

angular.module("uib/template/datepicker/datepicker.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepicker/datepicker.html",
    "<div class=\"uib-datepicker\" ng-switch=\"datepickerMode\" role=\"application\" ng-keydown=\"keydown($event)\">\n" +
    "  <uib-daypicker ng-switch-when=\"day\" tabindex=\"0\"></uib-daypicker>\n" +
    "  <uib-monthpicker ng-switch-when=\"month\" tabindex=\"0\"></uib-monthpicker>\n" +
    "  <uib-yearpicker ng-switch-when=\"year\" tabindex=\"0\"></uib-yearpicker>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/datepicker/day.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepicker/day.html",
    "<table class=\"uib-daypicker\" role=\"grid\" aria-labelledby=\"{{::uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left uib-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th colspan=\"{{::5 + showWeeks}}\"><button id=\"{{::uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm uib-title\" ng-click=\"toggleMode()\" ng-disabled=\"datepickerMode === maxMode\" tabindex=\"-1\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right uib-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "    <tr>\n" +
    "      <th ng-if=\"showWeeks\" class=\"text-center\"></th>\n" +
    "      <th ng-repeat=\"label in ::labels track by $index\" class=\"text-center\"><small aria-label=\"{{::label.full}}\">{{::label.abbr}}</small></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr class=\"uib-weeks\" ng-repeat=\"row in rows track by $index\">\n" +
    "      <td ng-if=\"showWeeks\" class=\"text-center h6\"><em>{{ weekNumbers[$index] }}</em></td>\n" +
    "      <td ng-repeat=\"dt in row\" class=\"uib-day text-center\" role=\"gridcell\"\n" +
    "        id=\"{{::dt.uid}}\"\n" +
    "        ng-class=\"::dt.customClass\">\n" +
    "        <button type=\"button\" class=\"btn btn-default btn-sm\"\n" +
    "          uib-is-class=\"\n" +
    "            'btn-info' for selectedDt,\n" +
    "            'active' for activeDt\n" +
    "            on dt\"\n" +
    "          ng-click=\"select(dt.date)\"\n" +
    "          ng-disabled=\"::dt.disabled\"\n" +
    "          tabindex=\"-1\"><span ng-class=\"::{'text-muted': dt.secondary, 'text-info': dt.current}\">{{::dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("uib/template/datepicker/month.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepicker/month.html",
    "<table class=\"uib-monthpicker\" role=\"grid\" aria-labelledby=\"{{::uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left uib-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th><button id=\"{{::uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm uib-title\" ng-click=\"toggleMode()\" ng-disabled=\"datepickerMode === maxMode\" tabindex=\"-1\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right uib-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr class=\"uib-months\" ng-repeat=\"row in rows track by $index\">\n" +
    "      <td ng-repeat=\"dt in row\" class=\"uib-month text-center\" role=\"gridcell\"\n" +
    "        id=\"{{::dt.uid}}\"\n" +
    "        ng-class=\"::dt.customClass\">\n" +
    "        <button type=\"button\" class=\"btn btn-default\"\n" +
    "          uib-is-class=\"\n" +
    "            'btn-info' for selectedDt,\n" +
    "            'active' for activeDt\n" +
    "            on dt\"\n" +
    "          ng-click=\"select(dt.date)\"\n" +
    "          ng-disabled=\"::dt.disabled\"\n" +
    "          tabindex=\"-1\"><span ng-class=\"::{'text-info': dt.current}\">{{::dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("uib/template/datepicker/year.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepicker/year.html",
    "<table class=\"uib-yearpicker\" role=\"grid\" aria-labelledby=\"{{::uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left uib-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th colspan=\"{{::columns - 2}}\"><button id=\"{{::uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm uib-title\" ng-click=\"toggleMode()\" ng-disabled=\"datepickerMode === maxMode\" tabindex=\"-1\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right uib-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr class=\"uib-years\" ng-repeat=\"row in rows track by $index\">\n" +
    "      <td ng-repeat=\"dt in row\" class=\"uib-year text-center\" role=\"gridcell\"\n" +
    "        id=\"{{::dt.uid}}\"\n" +
    "        ng-class=\"::dt.customClass\">\n" +
    "        <button type=\"button\" class=\"btn btn-default\"\n" +
    "          uib-is-class=\"\n" +
    "            'btn-info' for selectedDt,\n" +
    "            'active' for activeDt\n" +
    "            on dt\"\n" +
    "          ng-click=\"select(dt.date)\"\n" +
    "          ng-disabled=\"::dt.disabled\"\n" +
    "          tabindex=\"-1\"><span ng-class=\"::{'text-info': dt.current}\">{{::dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("uib/template/datepickerPopup/popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepickerPopup/popup.html",
    "<div>\n" +
    "  <ul class=\"uib-datepicker-popup dropdown-menu uib-position-measure\" dropdown-nested ng-if=\"isOpen\" ng-keydown=\"keydown($event)\" ng-click=\"$event.stopPropagation()\">\n" +
    "    <li ng-transclude></li>\n" +
    "    <li ng-if=\"showButtonBar\" class=\"uib-button-bar\">\n" +
    "      <span class=\"btn-group pull-left\">\n" +
    "        <button type=\"button\" class=\"btn btn-sm btn-info uib-datepicker-current\" ng-click=\"select('today', $event)\" ng-disabled=\"isDisabled('today')\">{{ getText('current') }}</button>\n" +
    "        <button type=\"button\" class=\"btn btn-sm btn-danger uib-clear\" ng-click=\"select(null, $event)\">{{ getText('clear') }}</button>\n" +
    "      </span>\n" +
    "      <button type=\"button\" class=\"btn btn-sm btn-success pull-right uib-close\" ng-click=\"close($event)\">{{ getText('close') }}</button>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/modal/backdrop.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/modal/backdrop.html",
    "<div class=\"modal-backdrop\"\n" +
    "     uib-modal-animation-class=\"fade\"\n" +
    "     modal-in-class=\"in\"\n" +
    "     ng-style=\"{'z-index': 1040 + (index && 1 || 0) + index*10}\"\n" +
    "></div>\n" +
    "");
}]);

angular.module("uib/template/modal/window.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/modal/window.html",
    "<div modal-render=\"{{$isRendered}}\" tabindex=\"-1\" role=\"dialog\" class=\"modal\"\n" +
    "    uib-modal-animation-class=\"fade\"\n" +
    "    modal-in-class=\"in\"\n" +
    "    ng-style=\"{'z-index': 1050 + index*10, display: 'block'}\">\n" +
    "    <div class=\"modal-dialog {{size ? 'modal-' + size : ''}}\"><div class=\"modal-content\" uib-modal-transclude></div></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/pager/pager.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/pager/pager.html",
    "<ul class=\"pager\">\n" +
    "  <li ng-class=\"{disabled: noPrevious()||ngDisabled, previous: align}\"><a href ng-click=\"selectPage(page - 1, $event)\">{{::getText('previous')}}</a></li>\n" +
    "  <li ng-class=\"{disabled: noNext()||ngDisabled, next: align}\"><a href ng-click=\"selectPage(page + 1, $event)\">{{::getText('next')}}</a></li>\n" +
    "</ul>\n" +
    "");
}]);

angular.module("uib/template/pagination/pagination.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/pagination/pagination.html",
    "<ul class=\"pagination\">\n" +
    "  <li ng-if=\"::boundaryLinks\" ng-class=\"{disabled: noPrevious()||ngDisabled}\" class=\"pagination-first\"><a href ng-click=\"selectPage(1, $event)\">{{::getText('first')}}</a></li>\n" +
    "  <li ng-if=\"::directionLinks\" ng-class=\"{disabled: noPrevious()||ngDisabled}\" class=\"pagination-prev\"><a href ng-click=\"selectPage(page - 1, $event)\">{{::getText('previous')}}</a></li>\n" +
    "  <li ng-repeat=\"page in pages track by $index\" ng-class=\"{active: page.active,disabled: ngDisabled&&!page.active}\" class=\"pagination-page\"><a href ng-click=\"selectPage(page.number, $event)\">{{page.text}}</a></li>\n" +
    "  <li ng-if=\"::directionLinks\" ng-class=\"{disabled: noNext()||ngDisabled}\" class=\"pagination-next\"><a href ng-click=\"selectPage(page + 1, $event)\">{{::getText('next')}}</a></li>\n" +
    "  <li ng-if=\"::boundaryLinks\" ng-class=\"{disabled: noNext()||ngDisabled}\" class=\"pagination-last\"><a href ng-click=\"selectPage(totalPages, $event)\">{{::getText('last')}}</a></li>\n" +
    "</ul>\n" +
    "");
}]);

angular.module("uib/template/tooltip/tooltip-html-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/tooltip/tooltip-html-popup.html",
    "<div class=\"tooltip\"\n" +
    "  tooltip-animation-class=\"fade\"\n" +
    "  uib-tooltip-classes\n" +
    "  ng-class=\"{ in: isOpen() }\">\n" +
    "  <div class=\"tooltip-arrow\"></div>\n" +
    "  <div class=\"tooltip-inner\" ng-bind-html=\"contentExp()\"></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/tooltip/tooltip-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/tooltip/tooltip-popup.html",
    "<div class=\"tooltip\"\n" +
    "  tooltip-animation-class=\"fade\"\n" +
    "  uib-tooltip-classes\n" +
    "  ng-class=\"{ in: isOpen() }\">\n" +
    "  <div class=\"tooltip-arrow\"></div>\n" +
    "  <div class=\"tooltip-inner\" ng-bind=\"content\"></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/tooltip/tooltip-template-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/tooltip/tooltip-template-popup.html",
    "<div class=\"tooltip\"\n" +
    "  tooltip-animation-class=\"fade\"\n" +
    "  uib-tooltip-classes\n" +
    "  ng-class=\"{ in: isOpen() }\">\n" +
    "  <div class=\"tooltip-arrow\"></div>\n" +
    "  <div class=\"tooltip-inner\"\n" +
    "    uib-tooltip-template-transclude=\"contentExp()\"\n" +
    "    tooltip-template-transclude-scope=\"originScope()\"></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/popover/popover-html.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/popover/popover-html.html",
    "<div class=\"popover\"\n" +
    "  tooltip-animation-class=\"fade\"\n" +
    "  uib-tooltip-classes\n" +
    "  ng-class=\"{ in: isOpen() }\">\n" +
    "  <div class=\"arrow\"></div>\n" +
    "\n" +
    "  <div class=\"popover-inner\">\n" +
    "      <h3 class=\"popover-title\" ng-bind=\"uibTitle\" ng-if=\"uibTitle\"></h3>\n" +
    "      <div class=\"popover-content\" ng-bind-html=\"contentExp()\"></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/popover/popover-template.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/popover/popover-template.html",
    "<div class=\"popover\"\n" +
    "  tooltip-animation-class=\"fade\"\n" +
    "  uib-tooltip-classes\n" +
    "  ng-class=\"{ in: isOpen() }\">\n" +
    "  <div class=\"arrow\"></div>\n" +
    "\n" +
    "  <div class=\"popover-inner\">\n" +
    "      <h3 class=\"popover-title\" ng-bind=\"uibTitle\" ng-if=\"uibTitle\"></h3>\n" +
    "      <div class=\"popover-content\"\n" +
    "        uib-tooltip-template-transclude=\"contentExp()\"\n" +
    "        tooltip-template-transclude-scope=\"originScope()\"></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/popover/popover.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/popover/popover.html",
    "<div class=\"popover\"\n" +
    "  tooltip-animation-class=\"fade\"\n" +
    "  uib-tooltip-classes\n" +
    "  ng-class=\"{ in: isOpen() }\">\n" +
    "  <div class=\"arrow\"></div>\n" +
    "\n" +
    "  <div class=\"popover-inner\">\n" +
    "      <h3 class=\"popover-title\" ng-bind=\"uibTitle\" ng-if=\"uibTitle\"></h3>\n" +
    "      <div class=\"popover-content\" ng-bind=\"content\"></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/progressbar/bar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/progressbar/bar.html",
    "<div class=\"progress-bar\" ng-class=\"type && 'progress-bar-' + type\" role=\"progressbar\" aria-valuenow=\"{{value}}\" aria-valuemin=\"0\" aria-valuemax=\"{{max}}\" ng-style=\"{width: (percent < 100 ? percent : 100) + '%'}\" aria-valuetext=\"{{percent | number:0}}%\" aria-labelledby=\"{{::title}}\" ng-transclude></div>\n" +
    "");
}]);

angular.module("uib/template/progressbar/progress.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/progressbar/progress.html",
    "<div class=\"progress\" ng-transclude aria-labelledby=\"{{::title}}\"></div>");
}]);

angular.module("uib/template/progressbar/progressbar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/progressbar/progressbar.html",
    "<div class=\"progress\">\n" +
    "  <div class=\"progress-bar\" ng-class=\"type && 'progress-bar-' + type\" role=\"progressbar\" aria-valuenow=\"{{value}}\" aria-valuemin=\"0\" aria-valuemax=\"{{max}}\" ng-style=\"{width: (percent < 100 ? percent : 100) + '%'}\" aria-valuetext=\"{{percent | number:0}}%\" aria-labelledby=\"{{::title}}\" ng-transclude></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/rating/rating.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/rating/rating.html",
    "<span ng-mouseleave=\"reset()\" ng-keydown=\"onKeydown($event)\" tabindex=\"0\" role=\"slider\" aria-valuemin=\"0\" aria-valuemax=\"{{range.length}}\" aria-valuenow=\"{{value}}\" aria-valuetext=\"{{title}}\">\n" +
    "    <span ng-repeat-start=\"r in range track by $index\" class=\"sr-only\">({{ $index < value ? '*' : ' ' }})</span>\n" +
    "    <i ng-repeat-end ng-mouseenter=\"enter($index + 1)\" ng-click=\"rate($index + 1)\" class=\"glyphicon\" ng-class=\"$index < value && (r.stateOn || 'glyphicon-star') || (r.stateOff || 'glyphicon-star-empty')\" ng-attr-title=\"{{r.title}}\"></i>\n" +
    "</span>\n" +
    "");
}]);

angular.module("uib/template/tabs/tab.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/tabs/tab.html",
    "<li ng-class=\"[{active: active, disabled: disabled}, classes]\" class=\"uib-tab nav-item\">\n" +
    "  <a href ng-click=\"select($event)\" class=\"nav-link\" uib-tab-heading-transclude>{{heading}}</a>\n" +
    "</li>\n" +
    "");
}]);

angular.module("uib/template/tabs/tabset.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/tabs/tabset.html",
    "<div>\n" +
    "  <ul class=\"nav nav-{{tabset.type || 'tabs'}}\" ng-class=\"{'nav-stacked': vertical, 'nav-justified': justified}\" ng-transclude></ul>\n" +
    "  <div class=\"tab-content\">\n" +
    "    <div class=\"tab-pane\"\n" +
    "         ng-repeat=\"tab in tabset.tabs\"\n" +
    "         ng-class=\"{active: tabset.active === tab.index}\"\n" +
    "         uib-tab-content-transclude=\"tab\">\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/timepicker/timepicker.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/timepicker/timepicker.html",
    "<table class=\"uib-timepicker\">\n" +
    "  <tbody>\n" +
    "    <tr class=\"text-center\" ng-show=\"::showSpinners\">\n" +
    "      <td class=\"uib-increment hours\"><a ng-click=\"incrementHours()\" ng-class=\"{disabled: noIncrementHours()}\" class=\"btn btn-link\" ng-disabled=\"noIncrementHours()\" tabindex=\"{{::tabindex}}\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "      <td>&nbsp;</td>\n" +
    "      <td class=\"uib-increment minutes\"><a ng-click=\"incrementMinutes()\" ng-class=\"{disabled: noIncrementMinutes()}\" class=\"btn btn-link\" ng-disabled=\"noIncrementMinutes()\" tabindex=\"{{::tabindex}}\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "      <td ng-show=\"showSeconds\">&nbsp;</td>\n" +
    "      <td ng-show=\"showSeconds\" class=\"uib-increment seconds\"><a ng-click=\"incrementSeconds()\" ng-class=\"{disabled: noIncrementSeconds()}\" class=\"btn btn-link\" ng-disabled=\"noIncrementSeconds()\" tabindex=\"{{::tabindex}}\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "      <td ng-show=\"showMeridian\"></td>\n" +
    "    </tr>\n" +
    "    <tr>\n" +
    "      <td class=\"form-group uib-time hours\" ng-class=\"{'has-error': invalidHours}\">\n" +
    "        <input type=\"text\" placeholder=\"HH\" ng-model=\"hours\" ng-change=\"updateHours()\" class=\"form-control text-center\" ng-readonly=\"::readonlyInput\" maxlength=\"2\" tabindex=\"{{::tabindex}}\" ng-disabled=\"noIncrementHours()\" ng-blur=\"blur()\">\n" +
    "      </td>\n" +
    "      <td class=\"uib-separator\">:</td>\n" +
    "      <td class=\"form-group uib-time minutes\" ng-class=\"{'has-error': invalidMinutes}\">\n" +
    "        <input type=\"text\" placeholder=\"MM\" ng-model=\"minutes\" ng-change=\"updateMinutes()\" class=\"form-control text-center\" ng-readonly=\"::readonlyInput\" maxlength=\"2\" tabindex=\"{{::tabindex}}\" ng-disabled=\"noIncrementMinutes()\" ng-blur=\"blur()\">\n" +
    "      </td>\n" +
    "      <td ng-show=\"showSeconds\" class=\"uib-separator\">:</td>\n" +
    "      <td class=\"form-group uib-time seconds\" ng-class=\"{'has-error': invalidSeconds}\" ng-show=\"showSeconds\">\n" +
    "        <input type=\"text\" placeholder=\"SS\" ng-model=\"seconds\" ng-change=\"updateSeconds()\" class=\"form-control text-center\" ng-readonly=\"readonlyInput\" maxlength=\"2\" tabindex=\"{{::tabindex}}\" ng-disabled=\"noIncrementSeconds()\" ng-blur=\"blur()\">\n" +
    "      </td>\n" +
    "      <td ng-show=\"showMeridian\" class=\"uib-time am-pm\"><button type=\"button\" ng-class=\"{disabled: noToggleMeridian()}\" class=\"btn btn-default text-center\" ng-click=\"toggleMeridian()\" ng-disabled=\"noToggleMeridian()\" tabindex=\"{{::tabindex}}\">{{meridian}}</button></td>\n" +
    "    </tr>\n" +
    "    <tr class=\"text-center\" ng-show=\"::showSpinners\">\n" +
    "      <td class=\"uib-decrement hours\"><a ng-click=\"decrementHours()\" ng-class=\"{disabled: noDecrementHours()}\" class=\"btn btn-link\" ng-disabled=\"noDecrementHours()\" tabindex=\"{{::tabindex}}\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "      <td>&nbsp;</td>\n" +
    "      <td class=\"uib-decrement minutes\"><a ng-click=\"decrementMinutes()\" ng-class=\"{disabled: noDecrementMinutes()}\" class=\"btn btn-link\" ng-disabled=\"noDecrementMinutes()\" tabindex=\"{{::tabindex}}\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "      <td ng-show=\"showSeconds\">&nbsp;</td>\n" +
    "      <td ng-show=\"showSeconds\" class=\"uib-decrement seconds\"><a ng-click=\"decrementSeconds()\" ng-class=\"{disabled: noDecrementSeconds()}\" class=\"btn btn-link\" ng-disabled=\"noDecrementSeconds()\" tabindex=\"{{::tabindex}}\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "      <td ng-show=\"showMeridian\"></td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("uib/template/typeahead/typeahead-match.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/typeahead/typeahead-match.html",
    "<a href\n" +
    "   tabindex=\"-1\"\n" +
    "   ng-bind-html=\"match.label | uibTypeaheadHighlight:query\"\n" +
    "   ng-attr-title=\"{{match.label}}\"></a>\n" +
    "");
}]);

angular.module("uib/template/typeahead/typeahead-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/typeahead/typeahead-popup.html",
    "<ul class=\"dropdown-menu\" ng-show=\"isOpen() && !moveInProgress\" ng-style=\"{top: position().top+'px', left: position().left+'px'}\" role=\"listbox\" aria-hidden=\"{{!isOpen()}}\">\n" +
    "    <li ng-repeat=\"match in matches track by $index\" ng-class=\"{active: isActive($index) }\" ng-mouseenter=\"selectActive($index)\" ng-click=\"selectMatch($index, $event)\" role=\"option\" id=\"{{::match.id}}\">\n" +
    "        <div uib-typeahead-match index=\"$index\" match=\"match\" query=\"query\" template-url=\"templateUrl\"></div>\n" +
    "    </li>\n" +
    "</ul>\n" +
    "");
}]);
angular.module('ui.bootstrap.carousel').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibCarouselCss && angular.element(document).find('head').prepend('<style type="text/css">.ng-animate.item:not(.left):not(.right){-webkit-transition:0s ease-in-out left;transition:0s ease-in-out left}</style>'); angular.$$uibCarouselCss = true; });
angular.module('ui.bootstrap.datepicker').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibDatepickerCss && angular.element(document).find('head').prepend('<style type="text/css">.uib-datepicker .uib-title{width:100%;}.uib-day button,.uib-month button,.uib-year button{min-width:100%;}.uib-left,.uib-right{width:100%}</style>'); angular.$$uibDatepickerCss = true; });
angular.module('ui.bootstrap.position').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibPositionCss && angular.element(document).find('head').prepend('<style type="text/css">.uib-position-measure{display:block !important;visibility:hidden !important;position:absolute !important;top:-9999px !important;left:-9999px !important;}.uib-position-scrollbar-measure{position:absolute !important;top:-9999px !important;width:50px !important;height:50px !important;overflow:scroll !important;}.uib-position-body-scrollbar-measure{overflow:scroll !important;}</style>'); angular.$$uibPositionCss = true; });
angular.module('ui.bootstrap.datepickerPopup').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibDatepickerpopupCss && angular.element(document).find('head').prepend('<style type="text/css">.uib-datepicker-popup.dropdown-menu{display:block;float:none;margin:0;}.uib-button-bar{padding:10px 9px 2px;}</style>'); angular.$$uibDatepickerpopupCss = true; });
angular.module('ui.bootstrap.tooltip').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibTooltipCss && angular.element(document).find('head').prepend('<style type="text/css">[uib-tooltip-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-bottom > .tooltip-arrow,[uib-popover-popup].popover.top-left > .arrow,[uib-popover-popup].popover.top-right > .arrow,[uib-popover-popup].popover.bottom-left > .arrow,[uib-popover-popup].popover.bottom-right > .arrow,[uib-popover-popup].popover.left-top > .arrow,[uib-popover-popup].popover.left-bottom > .arrow,[uib-popover-popup].popover.right-top > .arrow,[uib-popover-popup].popover.right-bottom > .arrow,[uib-popover-html-popup].popover.top-left > .arrow,[uib-popover-html-popup].popover.top-right > .arrow,[uib-popover-html-popup].popover.bottom-left > .arrow,[uib-popover-html-popup].popover.bottom-right > .arrow,[uib-popover-html-popup].popover.left-top > .arrow,[uib-popover-html-popup].popover.left-bottom > .arrow,[uib-popover-html-popup].popover.right-top > .arrow,[uib-popover-html-popup].popover.right-bottom > .arrow,[uib-popover-template-popup].popover.top-left > .arrow,[uib-popover-template-popup].popover.top-right > .arrow,[uib-popover-template-popup].popover.bottom-left > .arrow,[uib-popover-template-popup].popover.bottom-right > .arrow,[uib-popover-template-popup].popover.left-top > .arrow,[uib-popover-template-popup].popover.left-bottom > .arrow,[uib-popover-template-popup].popover.right-top > .arrow,[uib-popover-template-popup].popover.right-bottom > .arrow{top:auto;bottom:auto;left:auto;right:auto;margin:0;}[uib-popover-popup].popover,[uib-popover-html-popup].popover,[uib-popover-template-popup].popover{display:block !important;}</style>'); angular.$$uibTooltipCss = true; });
angular.module('ui.bootstrap.timepicker').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibTimepickerCss && angular.element(document).find('head').prepend('<style type="text/css">.uib-time input{width:50px;}</style>'); angular.$$uibTimepickerCss = true; });
angular.module('ui.bootstrap.typeahead').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibTypeaheadCss && angular.element(document).find('head').prepend('<style type="text/css">[uib-typeahead-popup].dropdown-menu{display:block;}</style>'); angular.$$uibTypeaheadCss = true; });/**
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

// FIX: openScope is undefined when dropdown is in modal
.service('uibDropdownService', ['$document', '$rootScope', function($document, $rootScope) {
    var openScope = null;

    this.open = function(dropdownScope, element) {
        if (!openScope) {
            $document.on('click', closeDropdown);
            element.on('keydown', keybindFilter);
        }

        if (openScope && openScope !== dropdownScope) {
            openScope.isOpen = false;
        }

        openScope = dropdownScope;
    };

    this.close = function(dropdownScope, element) {
        if (openScope === dropdownScope) {
            openScope = null;
            $document.off('click', closeDropdown);
            element.off('keydown', keybindFilter);
        }
    };

    var closeDropdown = function(evt) {
        // This method may still be called during the same mouse event that
        // unbound this event handler. So check openScope before proceeding.
        if (!openScope) { return; }

        if (evt && openScope.getAutoClose() === 'disabled') { return; }

        if (evt && evt.which === 3) { return; }

        var toggleElement = openScope.getToggleElement();
        if (evt && toggleElement && toggleElement[0].contains(evt.target)) {
            return;
        }

        var dropdownElement = openScope.getDropdownElement();
        if (evt && openScope.getAutoClose() === 'outsideClick' &&
            dropdownElement && dropdownElement[0].contains(evt.target)) {
            return;
        }

        openScope.isOpen = false;

        if (!$rootScope.$$phase) {
            openScope.$apply();
        }
    };

    var keybindFilter = function(evt) {
        if (evt.which === 27) {
            evt.stopPropagation();
            if(openScope) openScope.focusToggleElement();
            closeDropdown();
        } else if (openScope && openScope.isKeynavEnabled() && [38, 40].indexOf(evt.which) !== -1 && openScope.isOpen) {
            evt.preventDefault();
            evt.stopPropagation();
            openScope.focusDropdownEntry(evt.which);
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