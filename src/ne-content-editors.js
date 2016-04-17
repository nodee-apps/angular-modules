
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
.directive('contenteditable', ['$sce', function($sce) {
    return {
	restrict: 'A', // only activate on element attribute
	require: '?ngModel', // get a hold of NgModelController
	link: function(scope, element, attrs, ngModel) {
	    if(!ngModel) return; // do nothing if no ng-model
	    
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
            if(element[0].nodeName !== 'TEXTAREA' && attrs.contenteditable!=='true')
                throw new Error('neSelectionModel directive can be used only on <textarea> or contentEditable="true" element');

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

