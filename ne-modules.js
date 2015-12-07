
/**
 *                                                  NE CONTENT EDITORS
 * ***************************************************************************************************************************
 */

angular.module('neContentEditors',[])
.service('neMarkdown', ['$document','neReMarked', 'neMarked', function($document, reMarked, marked){
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
    var reMarker = new reMarked(reMarkedOptions);
    
    this.parseHTML = function(htmlString){
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
    
    this.renderHTML = function(mdString){
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
    
    
    this.editor = {
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
    
    return this;
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
		    br = doc.createElement('br');
		    th.appendChild(br);
		    tr.appendChild(th);
		}
		thead.appendChild(tr);
		
		for (var i=0; i < rows; i++) {
		    tr = doc.createElement('tr');
		    for (var j=0; j < cols; j++) {
			td = doc.createElement('td');
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
	scope:{ ngSelModel:'=' },
	link: function(scope, element, attrs, ctrl){
            if(element[0].nodeName !== 'TEXTAREA' && attrs.contenteditable!=='true')
		throw new Error('ngSelModel directive can be used only on <textarea> or contentEditable="true" element');
            
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
			scope.ngSelModel = {
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
		    var doc = angular.element(elm).parents('html').parent()[0];
		    var sel = doc.getSelection();
		    var selStart = sel.getRangeAt(0).startOffset;
		    var selEnd = sel.getRangeAt(0).endOffset;
		    var parent = angular.element(elm);
		    
		    scope.$apply(function(){
			scope.ngSelModel = {
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
                scope.ngSelModel = null;
            });
	}
    };
}])
.factory('neRemarked', [function(){


    /**
    * Copyright (c) 2013, Leon Sorokin
    * All rights reserved. (MIT Licensed)
    *
    * reMarked.js - DOM > markdown
    */

    reMarked = function(opts) {

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

    /*!
      * klass: a classical JS OOP façade
      * https://github.com/ded/klass
      * License MIT (c) Dustin Diaz & Jacob Thornton 2012
      */
    !function(a,b){typeof define=="function"?define(b):typeof module!="undefined"?module.exports=b():this[a]=b()}("klass",function(){function f(a){return j.call(g(a)?a:function(){},a,1)}function g(a){return typeof a===c}function h(a,b,c){return function(){var d=this.supr;this.supr=c[e][a];var f=b.apply(this,arguments);return this.supr=d,f}}function i(a,b,c){for(var f in b)b.hasOwnProperty(f)&&(a[f]=g(b[f])&&g(c[e][f])&&d.test(b[f])?h(f,b[f],c):b[f])}function j(a,b){function c(){}function l(){this.init?this.init.apply(this,arguments):(b||h&&d.apply(this,arguments),j.apply(this,arguments))}c[e]=this[e];var d=this,f=new c,h=g(a),j=h?a:this,k=h?{}:a;return l.methods=function(a){return i(f,a,d),l[e]=f,this},l.methods.call(l,k).prototype.constructor=l,l.extend=arguments.callee,l[e].implement=l.statics=function(a,b){return a=typeof a=="string"?function(){var c={};return c[a]=b,c}():a,i(this,a,d),this},l}var a=this,b=a.klass,c="function",d=/xyz/.test(function(){xyz})?/\bsupr\b/:/.*/,e="prototype";return f.noConflict=function(){return a.klass=b,this},a.klass=f,f});

    
    return reMarked;
}])
.factory('neMmarked', [function(){

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
.directive('neDraggable', [function() {
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
.directive('neDroppable', [function() {
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
        '        <span> {{\'page\'|translate}} <input type="number" class="input-{{size}} width-sm" ng-model="grid.pagination.page" min="1" max="{{grid.pagination.pages}}" ne-keypress-enter="grid.setPage(grid.pagination.page)"> {{\'of\'|translate}} {{grid.pagesCount}} <span class="hidden-xs">({{grid.pagination.count}} {{\'items\'|translate}})</span></span>' +
        
        '        <div class="btn-group btn-group-{{size}}">'+
        '           <button class="btn btn-default" ng-disabled="grid.nextDisabled" ng-click="grid.setPage(\'next\')"><span class="fa fa-forward"></span></button>' +
        '           <button class="btn btn-default" ng-disabled="grid.nextDisabled" ng-click="grid.setPage(\'last\')"><span class="fa fa-fast-forward"></span></button>' +
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
        this.getResourceMethod = settings.getResourceMethod || settings.resourceMethod || getResourceMethod; // getResourceMethod(opType, item)
        this.autoLoad = settings.autoLoad || settings.loadOnChange;
        this.multiSelect = settings.multiSelect || settings.multiselect || false;
        // if(!this.resource) throw new Error('neGrid: restResource is undefined');
        // if(!this.id) throw new Error('neGrid: grid must have an id');
        
        // defaults
        this.silentMode = false;
        this.pagination = { page: settings.page || this.defaultQuery.$page || 1 };
        this.page = this.pagination.page;
        this.pagesCount = 1;
        this.query = angular.merge({}, { $page:this.page, $limit:this.limit }, this.defaultQuery);
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
        grid.query = angular.merge({}, grid.defaultQuery || {}, newQuery || {});
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
        
        var query = angular.merge({}, newQuery, { $limit:grid.limit, $sort:{}, $page:grid.page });
        
        // merge sort with defaultSort
        if(grid.sort) query.$sort = grid.sort;
        query.$sort = angular.merge({}, grid.defaultSort || {}, query.$sort || {});
        if(Object.keys(query.$sort).length===0) delete query.$sort;
        
        delete grid.query.$page;
        delete grid.query.$sort;
        delete grid.query.$limit;
        grid.query = angular.merge(query, grid.query || {});
        
        if(grid.onQuery && !grid.silentMode) grid.onQuery(grid.query);
        
        return grid;
    }
    
    function createItem(item,cb){
        var grid = this;
        
        grid.getResourceMethod('create', item)(item, function(data){
            grid.setPage('first');
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
            grid.items[ index ] = angular.extend(grid.items[ index ], data);
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
            grid.items[ index ] = angular.extend(grid.items[ index ], items[0]);
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
.factory('neLoading',['$timeout', function($timeout) {
  var service = {
    requestCount: 0,
    isLoading: function() {
      return service.requestCount > 0;
    },
    statusTimeout:null,
    status:0,
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
      if(percent >= 0) service.status = percent;
      
      if(service.status > 0 && service.status < 99){
        service.statusTimeout = $timeout(function(){
          service.setStatus(randomIncrement(service.status));  
        }, 200, false);
      }
      else if(service.status >= 100){
        service.statusTimeout = $timeout(function(){
          service.setStatus(0);  
        }, 300, false);
      }
      
      service.fireStatusListeners();
    },
    reqStarted: function(debugNotes){
        if(service.statusTimeout) $timeout.cancel(service.statusTimeout);
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
      if (!config.ignoreLoadingBar && !isCached(config)) {
        loading.reqStarted();
      }
      return config;
    },
    
    response: function(response) {
      if (!isCached(response.config)) {
        loading.reqEnded();
      }
      return response;
    },
    
    responseError: function(rejection) {
      if (!isCached(rejection.config)) {
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
        $scope.loading = loading.status > 0;
        $scope.$digest();
    });
  
  //$scope.$watch(
  //  function(){
  //    return loading.status;
  //  },
  //  function(value){
  //    console.log(value);
  //    $scope.status = loading.status;
  //    $scope.loading = loading.status > 0;
  //});
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
    var langs = { default:{} };
    var currentPath = '/';
    
    this.translate = function(original){
        if(original===undefined || original===null) return '';
        var orig = original+'';
        var lang = langs[currentLangId] || {};
        lang.common = lang.common || {};
        return (lang[currentPath] ? lang[currentPath][orig] : null) || lang.common[orig] || langs['default'][orig] || orig || '';
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
        this.show('error', title, text, 'fa fa-exclamation-circle fa-2x', timeout!==undefined ? timeout : notifications.timeout * 2);
    };
    notifications.success = function(title, text, timeout){
        unifyArguments(title, text, timeout, arguments);
        this.show('success', title, text, 'fa fa-check-circle fa-2x', timeout);
    };
    notifications.warning = function(title, text, timeout){
        unifyArguments(title, text, timeout, arguments);
        this.show('warning', title, text, 'fa fa-warning fa-2x', timeout);
    };
    notifications.info = function(title, text, timeout){
        unifyArguments(title, text, timeout, arguments);
        this.show('info', title, text, 'fa fa-info-circle fa-2x', timeout);
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
                       '                        <div ng-if="!n.include">'+
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
.factory('neObject', [function(){
    
    var hasOwn = Object.prototype.hasOwnProperty;
    function isPlainObject(obj) {
        if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
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
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }
        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && typeof target !== "function") {
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
            if(!value) delete parentObj[key];
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
    
    function sortArray(keyName, dir, array){
        if(arguments.length===2){
            array = arguments[1];
            dir = 1;
        }
        
        if(dir==='asc') dir=1;
        if(dir==='desc') dir=-1;
        
        array.sort(function(a, b) {
            if (a[keyName] > b[keyName])
              return dir;
            if (a[keyName] < b[keyName])
              return -dir;
            // a must be equal to b
            return 0;
        });
        
        return array;
    }
    
    function objectToArray(obj, sortNamespace, dir){
        var array = [];
        
        for(var key in obj) {
            if(obj.hasOwnProperty(key)){
                obj.$key = key;
                obj.$sortIndex = deepGet(obj[key], sortNamespace);
                array.push(obj[key]);
            }
        }
        return sortArray('$sortIndex', dir || 'asc', array);
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
    
    return {
        extendReservedInstances:[File, FileList],
        extend:extend,
        setObjValue: deepSet,
        deepSet: deepSet,
        getObjValue: deepGet,
        deepGet:deepGet,
        deepReplace:deepReplace,
        deepRemove:deepRemove,
        objectToArray: objectToArray,
        arrayToObject: arrayToObject
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
        $equal:'=',
        $lt:'&lt;',
        $lte:'&lt;=',
        $gt:'&gt;',
        $gte:'&gt;=',
        $regex_exact:'exact match',
        $regex_contains:'contains',
        $regex_begins:'begins with',
        $regex_ends:'ends with',
        $in:'is in',
        $ne:'not equal',
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
        qtype_short_boolean:'Y/N',
        qtype_short_string:'A-Z',
        qtype_short_array:'[A]',
        qtype_short_object:'{O}',
        
        qtype_number:'Number',
        qtype_date:'Date',
        qtype_boolean:'Boolean',
        qtype_string:'Text',
        qtype_array:'Array',
        qtype_object:'Object',
        
        qvalue_true:'True',
        qvalue_false:'False',
        Search:'Search'
    });
}])
.run(['$templateCache', function($templateCache){
    $templateCache.put('neQuery/query.html',
                       '<div class="visible-inline-block">'+
                       '<div ng-repeat-start="query in query track by $index" class="visible-inline-block" style="position:relative;margin:2px" ng-style="{\'margin-top\':$first ? \'0px\' : \'2px\'}">'+
                       '    <small ng-if="!$first && query.logical===\'OR\' && !query.length">{{query.logical | translate}}<br></small>'+
                       '    <div ng-if="!query.length" class="visible-inline-block">'+
                       '        <div class="dropdown visible-inline-block" uib-dropdown uib-keyboard-nav>'+
                       '            <input type="text" class="input-sm" uib-dropdown-toggle ng-change="query.setFieldByName(query.fieldName)" ng-model="query.fieldName" />'+
                       '            <ul ng-if="query.fields.filterByName(query.fieldName, query.field.name).length" class="dropdown-menu">'+
                       '                <li ng-repeat="field in query.fields.filterByName(query.fieldName, query.field.name)" ng-class="{\'active\':(field.name===query.fieldName)}">'+
                       '                    <a href="" ng-click="query.setField(field)">'+
                       '			    {{field.name}}'+
                       '			</a>'+
                       '                </li>'+
                       '            </ul>'+
                       '        </div>'+
                       '        <div class="dropdown visible-inline-block" uib-dropdown uib-keyboard-nav>'+
                       '            <button ng-disabled="query.field.disableOperator" class="btn btn-default btn-sm" uib-dropdown-toggle style="width:120px;">'+
                       '                <span>{{query.operator | translate}}&nbsp;</span>'+
                       '            </button>'+
                       '            <ul class="dropdown-menu">'+
                       '                <li ng-if="!query.field.disableType" class="text-center">'+
                       '                    <div class="btn-group btngroup-xs">'+
                       '                        <button class="btn btn-default btn-xs" ng-class="{\'btn-success\':(query.type.name===type)}" style="padding:2px;" uib-tooltip="{{\'qtype_\'+type | translate}}" ng-repeat="type in query.types" ng-click="query.setType(type);$event.stopPropagation();">'+
                       '                        {{\'qtype_short_\'+type | translate}}'+
                       '                        </button>'+
                       '                    </div>'+
                       '                </li>'+
                       '                <li ng-if="!query.field.disableType" class="divider"></li>'+
                       '                <li ng-repeat="operator in query.type.operators" ng-class="{\'active\':(query.operator===operator)}">'+
                       '                    <a href="" ng-click="query.setOperator(operator)">'+
                       '			    <span ng-bind-html="operator|translate|html"></span>'+
                       '			</a>'+
                       '                </li>'+
                       '            </ul>'+
                       '        </div>'+
                       '        <div class="visible-inline-block" ne-query-value="query"></div>'+
                       '        <div class="btn-group btn-group-xs">'+
                       '            <button class="btn btn-default" ng-click="query.next(\'AND\')">{{::\'AND\' | translate}}</button>'+
                       '            <button class="btn btn-default" ng-click="query.next(\'OR\')">{{::\'OR\' | translate}}</button>'+
                       '            <button class="btn btn-default" ng-click="query.levelDown()"><i class="fa fa-fw fa-level-down"></i></button>'+
                       '            <button class="btn btn-default" ng-click="close();query.remove()"><i class="fa fa-fw fa-minus"></i></button>'+
                       '        </div>'+
                       '    </div>'+
                       '    <div ng-if="query.length" class="visible-inline-block" style="position:relative;">'+
                       '        <small>{{query.logical | translate}}<br></small>'+
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
                       '       uib-datepicker-popup '+
                       '       is-open="query.value_opened" '+
                       '       ng-click="query.value_opened=!query.value_opened" '+
                       '       ng-model="query.value"/>');
    
    $templateCache.put('neQuery/number.html',
                       '<input type="number" class="input-sm" ng-model="query.value" style="width:142px;"/>');
    
    $templateCache.put('neQuery/list.html',
                       '<select class="input-sm" '+
                       '        ng-model="query.value" '+
                       '        ng-options="(value | translate) for value in query.field.values" '+
                       '        style="width:142px;">'+
                       '</select>');
    
    $templateCache.put('neQuery/boolean.html',
                       '<select class="input-sm" '+
                       '        ng-model="query.value" '+
                       '        ng-options="(\'qvalue_\'+value | translate) for value in [true,false]" '+
                       '        style="width:142px;">'+
                       '</select>');
    
    $templateCache.put('neQuery/string.html',
                       '<input type="text" class="input-sm" ng-model="query.value"/>');
    
    $templateCache.put('neQuery/disabled.html',
                       '<input type="text" disabled="disabled" class="input-sm" ng-model="query.value"/>');
    
    $templateCache.put('neQuery/sort.html',
                       '<div class="visible-inline-block">'+
                       '<div ng-repeat-start="sort in query.sortBy track by $index" style="display:inline-block;position:relative;margin:2px" ng-style="{\'margin-top\':$first ? \'0px\' : \'2px\'}">'+
                       '    <div class="visible-inline-block">'+
                       '        <div class="dropdown visible-inline-block" uib-dropdown uib-keyboard-nav>'+
                       '            <input type="text" class="input-sm dropdown-toggle" uib-dropdown-toggle ng-change="query.setSortByName(sort.fieldName, $index)" ng-model="sort.fieldName" />'+
                       '            <ul ng-if="query.fields.filterByName(sort.fieldName, sort.name).length" class="dropdown-menu">'+
                       '                <li ng-repeat="field in query.fields.filterByName(sort.fieldName, sort.name)" ng-class="{\'active\':(field.name===sort.fieldName)}">'+
                       '                    <a href="" ng-click="query.setSortField(field,$parent.$index)">'+
                       '        			    {{field.name}}'+
                       '        			</a>'+
                       '                </li>'+
                       '            </ul>'+
                       '        </div>'+
                       '        <div class="btn-group btn-group-xs">'+
                       '            <button class="btn btn-default" ng-click="query.toggleSortDirection($index)">'+
                       '                <i class="fa fa-fw" ng-class="{\'fa-sort-amount-asc\':sort.direction===1,\'fa-sort-amount-desc\':sort.direction===-1}"></i>'+
                       '            </button>'+
                       '            <button class="btn btn-default" ng-click="query.addSort($index)"><i class="fa fa-fw fa-plus"></i></button>'+
                       '            <button class="btn btn-default" ng-click="query.removeSort($index)"><i class="fa fa-fw fa-minus"></i></button>'+
                       '        </div>'+
                       '    </div>'+
                       '</div>'+
                       '<br ng-repeat-end>'+
                       '<button ng-if="!query.sortBy.length" class="btn btn-default btn-sm" ng-click="query.addSort()"><i class="fa fa-fw fa-signal"></i></button>'+
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
        template: '<div class="pull-left" ne-query="query"></div>'+
        '<div class="pull-left" ne-query-sort="query"></div>'+
        '<button class="btn btn-primary btn-sm" ng-click="searchClick()" style="margin-left:2px">'+
        '    <i class="fa fa-fw fa-search"></i>'+
        '    <span class="hidden-sm">{{::\'Search\' | translate}}</span>'+
        '</button>',
        scope:{ query:'=neQuerySearch', searchClick:'&neQuerySearchClick' },
        link: function(elm, scope, attrs, ctrl){

        }
    };
}])
.directive('neQuery',[function(){
    return {
        restrict:'A',
        templateUrl: 'neQuery/query.html',
        scope:{ query:'=neQuery' },
        link: function(elm, scope, attrs, ctrl){

        }
    };
}])
.directive('neQuerySort',[function(){
    return {
        restrict:'A',
        templateUrl: 'neQuery/sort.html',
        scope:{ query:'=neQuerySort' },
        link: function(elm, scope, attrs, ctrl){

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
        list: 'neQuery/list.html'
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
            operators:['$equal','$lt','$lte','$gt','$gte'], // '=','<','<=','>','>='
            template: templates.number
        },
        boolean:{
            name:'boolean',
            operators:['$equal'], // 'is'
            template: templates.boolean,
            onBuild: function(value){ if([true,'true','True',1,'yes','Yes'].indexOf(value)!==-1) return true; else return false; }
        },
        date:{
            name:'date',
            operators:['$equal','$lt','$lte','$gt','$gte'], // '=','<','<=','>','>='
            template: templates.date
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
                query.setSortByName(key, query.sort.length-1).direction = sortBy[key];
            }
        }
        return s;
    }
    
    function build(query){
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
            
            // no OR query, just ands
            if(g===0) {
                var presult;
                for(var i=0;i<andGroups[g].length;i++){
                    presult = build(andGroups[g][i]);
                    
                    // on key conflicts, use custom merge method if defined
                    if(andGroups[g][i].field.merge) for(var pkey in presult){
                        if(result[ pkey ]!==undefined){
                            result = andGroups[g][i].field.merge(pkey, presult, result);
                        }
                        else result[pkey] = presult[pkey];
                    }
                    else result = object.extend(true, result, presult);
                }
            }
            // mixed ors and ands
            else result = object.extend(true, result, queries['OR'].build(andGroups));
        }
        // simple query
        else if(query.operator && query.field && query.field.key) {
            value = angular.copy(query.value);
            if(query.type.onBuild) value = query.type.onBuild(value);
            value = queries[ query.operator ].build(typeof query.field.onBuild==='function' ? query.field.onBuild(value) : value);
            if(value!==undefined && value!==null) {
                if(query.field.build) {
                    var customBuild = query.field.build(query.field.key, value, query); // custom field build
                    result[ customBuild.key || query.field.key] = customBuild.key ? customBuild.value : customBuild;
                }
                else result[query.field.key] = value;
            }
        }
        
        // build sort
        if((query.sortBy || {}).length) result = object.extend(true, result, buildSort.call(query, query.sortBy));
        
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
                query.options[key] = builtQuery[key]; // store values to 
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
                    if(keys.length===1) query.parse(result.queries[i], result.logical);
                    
                    // if nested ors, create one child and then append to it all remaining queries
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
            child.setFieldByName(result.fieldName, true); // reset if defined, because default field (first) was already set
            child.type = types[result.typeName];
            child.operator = result.operator;
            child.value = result.value;
        }
        
        return query;
    }
    
    // date parse regex
    var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
    function parseValueType(value){
        var type, match, milliseconds;
        
        if(typeof value==='boolean') type = 'boolean';
        else if(typeof value==='number') type = 'number';
        else if(value instanceof Date) type = 'date';
        else if(typeof value==='string') {
            match = value.match(regexIso8601)
            if(match) milliseconds = Date.parse(match[0]);
            if (!isNaN(milliseconds)) {
                value = new Date(milliseconds);
                type = 'date';
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
                var $and = [];
                for(var i=0;i<(value.length||0);i++){
                    $and.push(build(value[i]));
                }
                return { $and: $and };
            }
        },
        OR:{ // called on build when OR operator
            build: function(value){
                var $or = [];
                for(var i=0;i<(value.length||0);i++){
                    $or.push(build(value[i]));
                }
                return { $or: $or };
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
                    operator: type==='string' ? '$regex_exact' : '$equal',
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
        $equal:{ // virtual, called on build when equal operator
            build: function(value){
                return value;
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
                
                if(type==='number' || type==='date') return {
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
                
                if(type==='number' || type==='date') return {
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
                
                if(type==='number' || type==='date') return {
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
                
                if(type==='number' || type==='date') return {
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
                    if(queries[op] && queries[op].check && (match = queries[op].check(value))) {
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
                value = ( value.match(/^\.\*(.+)\.\*$/ ) || [] )[1];
                return unEscapeRegExp(value||'');
            }
        },
        $regex_ncontains:{ // regex shortcut
            build: function(value){
                value = value = escapeRegExp(value);
                return { $regex: '^((?!' +value+ ').)*$' };
            },
            check: function(value){
                value = (value.match(/^\^\(\(\?\!(.+)\)\.\)\*\$$/) || [])[1];
                return unEscapeRegExp(value||'');
            }
        },
        $regex_begins:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value);
                return { $regex: '^' +value+ '.*' };
            },
            check: function(value){
                value = (value.match(/^\^(.+)\.\*$/) || [])[1];
                return unEscapeRegExp(value||'');
            }
        },
        $regex_nbegins:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value);
                return { $regex: '^(?!' +value+ ').*$' };
            },
            check: function(value){
                value = (value.match(/^\^\(\?\!(.+)\)\.\*\$$/) || [])[1];
                return unEscapeRegExp(value||'');
            }
        },
        $regex_ends:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value);
                return { $regex: '.*' +value+ '$' };
            },
            check: function(value){
                value = (value.match(/^\.\*(.+)\$$/) || [])[1];
                return unEscapeRegExp(value||'');
            }
        },
        $regex_nends:{ // regex shortcut
            build: function(value){
                value = escapeRegExp(value);
                return { $regex: '^(?!.*' +value+ '$)' };
            },
            check: function(value){
                value = (value.match(/^\^\(\?\!\.\*(.+)\$\)$/) || [])[1];
                return unEscapeRegExp(value||'');
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
        q.build = function(){ return build.call(this, this); };
        q.parse = function(builtQuery, logical){ return parse.call(this, builtQuery, logical); };
        q.fill = function(builtQuery){ 
            this.splice(0, this.length); // clear array
            this.parse(builtQuery); // start with first child
            if(!this.parent && this.length===0) this.append('AND'); // if this is root query and there is no child, add one
            return q;
        };
        q.clear = clear;
        q.newQuery = newQuery;
        q.templates = templates;
        q.fields = this.fields; // inherit fields
        q.types = this.types; // inherit types
        q.logical = logical || 'AND'; // default logical is AND
        q.append = append;
        q.next = next;
        q.levelDown = levelDown;
        q.remove = remove;
        q.reset = reset;
        q.setFieldByName = setFieldByName;
        q.setField = setField;
        q.setOperator = setOperator;
        q.setType = setType;
        q.addSort = addSort;
        q.removeSort = removeSort;
        q.toggleSortDirection = toggleSortDirection;
        q.setSortByName = setSortByName;
        q.setSortField = setSortField;
        
        // set initial query state
        q.reset();
        
        return q;
    }
    
    function append(logical){
        var q = this.newQuery(logical);
        q.parent = this;
        this.push(q);
        return q;
    }
    
    function levelDown(logical){
        var self = this;
        if(!self.parent) return;
        
        // if this is only child of parent disable levelDovn
        if(self.parent.length<=1) return;
        
        var index = self.parent.indexOf(self);
        var wrapper = self.next(self.logical);
        self.parent.splice(index, 1); // remove element from parent
        self.logical = 'AND'; // default logical if first element
        self.parent = wrapper; // now, parent is wrapper
        wrapper.push(self); // append element to wrapper
        
        return wrapper;
    }
    
    function next(logical){
        var self = this;
        if(!self.parent) return;
        
        var index = self.parent.indexOf(self);
        var q = this.newQuery(logical);
        q.parent = self.parent;
        
        self.parent.splice(index+1,0,q);
        return q;
    }
    
    function remove(){
        var self = this;
        if(!self.parent) return;
        
        // don't remove last root element, just reset field
        if(!self.parent.parent && self.parent.length===1) return self.reset();
        
        // if removing last child of element, remove also element
        if(self.parent.length===1) return self.parent.remove();
        
        var index = self.parent.indexOf(self);
        self.parent.splice(index,1);
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
            q.type = q.type || q.types[0];
            q.operator = q.type.operators[0];
        }
        q.value = null;
    }
    
    function clear(){
        this.splice(0, this.length); // clear array
        return this;
    }
    
    function setFieldByName(fieldName, resetIfDefined){
        if(fieldName){
            var fieldNameLower = fieldName.toLowerCase();
            for(var i=0;i<this.fields.length;i++){
                if(this.fields[i].key===fieldName || this.fields[i].nameLower===fieldNameLower){
                    return this.setField(this.fields[i]); // match with predefined fields
                }
                else if(this.fields[i].match && (fieldName.match(this.fields[i].match) || fieldNameLower.match(this.fields[i].match))){
                    if(!resetIfDefined && this.field && this.field.field === this.fields[i].field) return;
                    else return this.setField(this.fields[i], fieldName); // match with predefined fields
                }
            }
        }
        this.fieldName = fieldName;
        this.field = { key:fieldName };
    }
    
    function setField(field, fieldName){
        // field type changed, reset value
        if(this.type.name !== field.type){
            this.type = types[ field.type ];
            if(!this.type) throw new Error('Field type "' +field.type+ '" not recognized, please choose one from "' +Object.keys(types).join(', ')+ '"');
            // this.operator = this.type.operators[0];
            this.value = null;
        }
        this.field = angular.copy(field||{});
        this.fieldName = fieldName || this.field.name;
        
        // set default operator, if field has operatorIndex
        this.operator = this.type.operators[ this.field.operatorIndex||0 ];
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
    
    function Query(name, fields){
        if(arguments.length===1 && typeof arguments[0]!=='string'){
            fields = arguments[0];
            name = null;
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

            // if operator is set, disable changing operator
            if(fields[i].operatorIndex >= 0) fields[i].disableOperator = true;
            fields[i].operatorIndex = fields[i].operatorIndex || fields[i].defaultOperatorIndex;

            // set list template if values are set, but template not
            if(fields[i].values && !fields[i].template) fields[i].template = templates.list;
        }
        fields.filterByName = filterByName;

        var q = newQuery.call({ fields:fields, types:Object.keys(types) },'AND'); // default logical is AND
        q.append('AND');

        q.name = name;

        // q.strictFields = false;
        // q.onParse

        return q;
    }
    
    Query.templates = templates;
    Query.fieldBehaviours = fieldBehaviours;
    
    return Query;

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
            url = replaceStringAll(url,'{' +urlParams[i]+ '}', stringifyWithoutQuotes(value));
        }
        
        return unifyUrlPath(url, true);
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
        var fd = new FormData();
        
        for(var key in data) {
            fd.append(key, data[key]);
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
            loading.reqEnded();
            
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
            loading.reqStarted(); // show loading notification
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
        
        if(query.$page === 0) throw new Error('adad');
        
        // replace default pagination props by custom if defined
        if(pageKey !== '$page'){
            query = object.deepSet(query, pageKey, query.$page);
            delete query.$page;
        }
        if(limitKey !== '$limit'){
            query = object.deepSet(query, limitKey, query.$limit);
            delete query.$limit;
        }
        if(sortKey !== '$sort'){
            query = object.deepSet(query, sortKey, query.$sort);
            delete query.$sort;
        }
        
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
            headers: headers
        };
        
        if(method === 'post-multipart' || method === 'upload') upload.call(resource, cmdName, query, httpOpts, successCbs, errorCbs, progressCbs);
        else $http(httpOpts).then(handleSuccess(query, opts, cmdName, successCbs), handleError(query, opts, cmdName, errorCbs));
    };
    
    
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
    
}])
.factory('NeResourceTransformators.dateStringsToDates', [function(){
    
    // auto parse dates
    var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
    var regexIsoJson = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    
    function dateStringsToDates(input, useIsoJson) {
        var value, match, milliseconds;
        
        // try to parse if input is string
        if(typeof input === 'string' && (match = input.match(useIsoJson ? regexIsoJson : regexIso8601))) {
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
            if(typeof value === 'string' && (match = value.match(useIsoJson ? regexIsoJson : regexIso8601))) {
                milliseconds = Date.parse(match[0]);
                if (!isNaN(milliseconds)) {
                    input[key] = new Date(milliseconds);
                }
            }
            else if (typeof value === 'object') {
                // Recurse into object
                dateStringsToDates(value);
            }
        }        
        return input;
    }
    
    return dateStringsToDates;
}])
.factory('NeResourceTransformators.removePrefixedProps', [function(){
    
    function removePrefixedProps(input, prefix) {
        
        // Ignore things that aren't objects.
        if(typeof input !== 'object') return input;
        
        for(var key in input) {
            if(input.hasOwnProperty(key)) {
                var value = input[key];
                
                if(key.indexOf(prefix)===0) delete input[key];
                else if(typeof value === 'object') removePrefixedProps(value, prefix);
            }
        }
    }
    
    return removePrefixedProps;
}]);
/**
 *                                                  NE STATE
 * ***************************************************************************************************************************
 */

angular.module('neState', ['ngCookies'])
.factory('NeStateService',['$timeout','$location','$rootScope','$cookies', function($timeout, $location, $rootScope, $cookies){

	
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
            locationString = decodeURIComponent( locationString || $location.search()[ locationPrefix ] );

            try {
                if(encryptLocation) locationString = decryptString(locationString);
                return angular.fromJson(locationString || '{}') || {};
            }
            catch(err){}
            return {};
        },
        builder: function(stateObj){
            var locationPrefix = this.prefix;
            var encryptLocation = this.encrypt;
            var str = encodeURIComponent( JSON.stringify(stateObj) );

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
            
            if(stateId) locationStore._unbinders[ stateId || '_root'] = {
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
                for(var key in (locationStore._unbinders[id] || {})){
                    locationStore._unbinders[id][key].routeUpdate();
                    locationStore._unbinders[id][key].routeChangeSuccess();
                }
            }
        },
        fill: function(state, stateId){
            var locationStore = this;
            var locationString = $location.search()[ locationStore.prefix ];
            var stateObj = locationStore.parser(locationString) || {};

            $timeout(function(){
                if(id) state.change(id, stateObj[id] || {}, true);
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
                if(id) state.change(id, stateObj[id] || {}, true);
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

		state.history[id].splice(currIndex + 1, howManyRemove);
		state.history[id] = state.history[id];
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
    
    StateService.prototype.unbind = 
    StateService.prototype.destroy = function(id) {
        if(id) {
            this.clear(id);
        }
        else {
            this.history = {};
            this.changeListeners = [];
            this.store.unbind(this, id);
            for(var s in this.history[id].store) this.history[id].store[s].unbind(this, id);
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
		if(prevIndex < 0) prevIndex = 0;
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
        this.getResourceMethod = settings.getResourceMethod || settings.resourceMethod || getResourceMethod; // getResourceMethod(resource, opType, item)
        this.onRemove = settings.onRemove;
        this.resource = settings.restResource || settings.resource;
        this.autoLoad = settings.autoLoad || settings.loadOnChange;
        this.multiSelect = settings.multiSelect || settings.multiselect || false;
        // if(!this.resource) throw new Error('settings.resource is undefined');
        // if(!this.id) throw new Error('Tree must have property "id"');
        
        // defaults
        this.silentMode = false;
        this.$query = angular.merge({}, { $page:this.$page, $limit:this.$limit }, this.defaultQuery);
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
        var parentKey = tree.ancestorsReferenceKey;
        var childrenKey = tree.childrenReferenceKey;
        var countKey = tree.childrenCountKey;
        
        if(ancKey && !remove) {
            var ancs = object.deepGet(parent, ancKey) || [];
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
            
            if(!remove) childIds.push( object.deepGet(child, idKey) );
            else {
                var index = childIds.indexOf( childId );
                if(index > -1) childIds.splice(index, 1);
            }
            object.deepSet(parent, childrenKey, childIds);
        }
        
        if(countKey) {
            var count = object.deepGet(parent, countKey) || 0;
            object.deepSet(parent, countKey, count+( child ? 1 : -1 ));
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
                query = angular.merge({}, { $page:1, $limit:(tree.$limit || tree.defaultLimit) }, query, tree.getChildrenQuery(parent));
                if(query.$sort) query.$sort = angular.merge({}, tree.defaultSort ,query.$sort);
                
                if(parent) parent.$query = query;
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
        parent.$query = angular.merge({}, tree.defaultQuery || {}, newQuery || {});
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

        var query = angular.merge({}, newQuery, { $limit:parent.$limit, $sort:{}, $page:parent.$page });

        // merge sort with defaultSort
        if(parent.$sort) query.$sort = parent.$sort;
        query.$sort = angular.merge({}, tree.defaultSort || {}, parent.$sort || {});
        if(Object.keys(query.$sort).length===0) delete query.$sort;

        if(parent.$query){
            delete parent.$query.$page;
            delete parent.$query.$sort;
            delete parent.$query.$limit;
        }
        parent.$query = angular.merge(query, parent.$query || {});
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
        
        var child = item;
        tree.maintainReferences(parent, item);
        
        tree.getResourceMethod('create', item, parent)(item, function(newItem){
            item = angular.merge(item, newItem);
            
            if(appendChild && parent) {
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
            item = angular.merge(item, data);
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
}]);
/**
 *                                                  OC LAZY LOAD (https://oclazyload.readme.io/)
 * ***************************************************************************************************************************
 */

(function() {
  'use strict';
  var regModules = ['ng'],
    regInvokes = {},
    regConfigs = [],
    justLoaded = [],
    runBlocks = {},
    ocLazyLoad = angular.module('oc.lazyLoad', ['ng']),
    broadcast = angular.noop;

  ocLazyLoad.provider('$ocLazyLoad', ['$controllerProvider', '$provide', '$compileProvider', '$filterProvider', '$injector', '$animateProvider',
    function($controllerProvider, $provide, $compileProvider, $filterProvider, $injector, $animateProvider) {
      var modules = {},
        providers = {
          $controllerProvider: $controllerProvider,
          $compileProvider: $compileProvider,
          $filterProvider: $filterProvider,
          $provide: $provide, // other things
          $injector: $injector,
          $animateProvider: $animateProvider
        },
        anchor = document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0],
        jsLoader, cssLoader, templatesLoader,
        debug = false,
        events = false;

      // Let's get the list of loaded modules & components
      init(angular.element(window.document));

      this.$get = ['$log', '$q', '$templateCache', '$http', '$rootElement', '$rootScope', '$cacheFactory', '$interval', function($log, $q, $templateCache, $http, $rootElement, $rootScope, $cacheFactory, $interval) {
        var instanceInjector,
          filesCache = $cacheFactory('ocLazyLoad'),
          uaCssChecked = false,
          useCssLoadPatch = false;

        if(!debug) {
          $log = {};
          $log['error'] = angular.noop;
          $log['warn'] = angular.noop;
          $log['info'] = angular.noop;
        }

        // Make this lazy because at the moment that $get() is called the instance injector hasn't been assigned to the rootElement yet
        providers.getInstanceInjector = function() {
          return (instanceInjector) ? instanceInjector : (instanceInjector = ($rootElement.data('$injector') || angular.injector()));
        };

        broadcast = function broadcast(eventName, params) {
          if(events) {
            $rootScope.$broadcast(eventName, params);
          }
          if(debug) {
            $log.info(eventName, params);
          }
        }

        /**
         * Load a js/css file
         * @param type
         * @param path
         * @returns promise
         */
        var buildElement = function buildElement(type, path, params) {
          var deferred = $q.defer(),
            el, loaded,
            cacheBuster = function cacheBuster(url) {
              var dc = new Date().getTime();
              if(url.indexOf('?') >= 0) {
                if(url.substring(0, url.length - 1) === '&') {
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
          if(angular.isUndefined(filesCache.get(path))) {
            filesCache.put(path, deferred.promise);
          }

          // Switch in case more content types are added later
          switch(type) {
            case 'css':
              el = document.createElement('link');
              el.type = 'text/css';
              el.rel = 'stylesheet';
              el.href = params.cache === false ? cacheBuster(path) : path;
              break;
            case 'js':
              el = document.createElement('script');
              el.src = params.cache === false ? cacheBuster(path) : path;
              break;
            default:
              deferred.reject(new Error('Requested type "' + type + '" is not known. Could not inject "' + path + '"'));
              break;
          }
          el.onload = el['onreadystatechange'] = function(e) {
            if((el['readyState'] && !(/^c|loade/.test(el['readyState']))) || loaded) return;
            el.onload = el['onreadystatechange'] = null
            loaded = 1;
            broadcast('ocLazyLoad.fileLoaded', path);
            deferred.resolve();
          }
          el.onerror = function(e) {
            deferred.reject(new Error('Unable to load ' + path));
          }
          el.async = params.serie ? 0 : 1;

          var insertBeforeElem = anchor.lastChild;
          if(params.insertBefore) {
            var element = angular.element(params.insertBefore);
            if(element && element.length > 0) {
              insertBeforeElem = element[0];
            }
          }
          anchor.insertBefore(el, insertBeforeElem);

          /*
           The event load or readystatechange doesn't fire in:
           - iOS < 6       (default mobile browser)
           - Android < 4.4 (default mobile browser)
           - Safari < 6    (desktop browser)
           */
          if(type == 'css') {
            if(!uaCssChecked) {
              var ua = navigator.userAgent.toLowerCase();

              // iOS < 6
              if(/iP(hone|od|ad)/.test(navigator.platform)) {
                var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
                var iOSVersion = parseFloat([parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)].join('.'));
                useCssLoadPatch = iOSVersion < 6;
              } else if(ua.indexOf("android") > -1) { // Android < 4.4
                var androidVersion = parseFloat(ua.slice(ua.indexOf("android") + 8));
                useCssLoadPatch = androidVersion < 4.4;
              } else if(ua.indexOf('safari') > -1 && ua.indexOf('chrome') == -1) {
                var safariVersion = parseFloat(ua.match(/version\/([\.\d]+)/i)[1]);
                useCssLoadPatch = safariVersion < 6;
              }
            }

            if(useCssLoadPatch) {
              var tries = 1000; // * 20 = 20000 miliseconds
              var interval = $interval(function() {
                try {
                  el.sheet.cssRules;
                  $interval.cancel(interval);
                  el.onload();
                } catch(e) {
                  if(--tries <= 0) {
                    el.onerror();
                  }
                }
              }, 20);
            }
          }

          return deferred.promise;
        }

        if(angular.isUndefined(jsLoader)) {
          /**
           * jsLoader function
           * @type Function
           * @param paths array list of js files to load
           * @param callback to call when everything is loaded. We use a callback and not a promise
           * @param params object config parameters
           * because the user can overwrite jsLoader and it will probably not use promises :(
           */
          jsLoader = function(paths, callback, params) {
            var promises = [];
            angular.forEach(paths, function loading(path) {
              promises.push(buildElement('js', path, params));
            });
            $q.all(promises).then(function success() {
              callback();
            }, function error(err) {
              callback(err);
            });
          }
          jsLoader.ocLazyLoadLoader = true;
        }

        if(angular.isUndefined(cssLoader)) {
          /**
           * cssLoader function
           * @type Function
           * @param paths array list of css files to load
           * @param callback to call when everything is loaded. We use a callback and not a promise
           * @param params object config parameters
           * because the user can overwrite cssLoader and it will probably not use promises :(
           */
          cssLoader = function(paths, callback, params) {
            var promises = [];
            angular.forEach(paths, function loading(path) {
              promises.push(buildElement('css', path, params));
            });
            $q.all(promises).then(function success() {
              callback();
            }, function error(err) {
              callback(err);
            });
          }
          cssLoader.ocLazyLoadLoader = true;
        }

        if(angular.isUndefined(templatesLoader)) {
          /**
           * templatesLoader function
           * @type Function
           * @param paths array list of css files to load
           * @param callback to call when everything is loaded. We use a callback and not a promise
           * @param params object config parameters for $http
           * because the user can overwrite templatesLoader and it will probably not use promises :(
           */
          templatesLoader = function(paths, callback, params) {
            var promises = [];
            angular.forEach(paths, function(url) {
              var deferred = $q.defer();
              promises.push(deferred.promise);
              $http.get(url, params).success(function(data) {
                if(angular.isString(data) && data.length > 0) {
                  angular.forEach(angular.element(data), function(node) {
                    if(node.nodeName === 'SCRIPT' && node.type === 'text/ng-template') {
                      $templateCache.put(node.id, node.innerHTML);
                    }
                  });
                }
                if(angular.isUndefined(filesCache.get(url))) {
                  filesCache.put(url, true);
                }
                deferred.resolve();
              }).error(function(err) {
                deferred.reject(new Error('Unable to load template file "' + url + '": ' + err));
              });
            });
            return $q.all(promises).then(function success() {
              callback();
            }, function error(err) {
              callback(err);
            });
          }
          templatesLoader.ocLazyLoadLoader = true;
        }

        var filesLoader = function(config, params) {
          var cssFiles = [],
            templatesFiles = [],
            jsFiles = [],
            promises = [],
            cachePromise = null;

          angular.extend(params || {}, config);

          var pushFile = function(path) {
            cachePromise = filesCache.get(path);
            if(angular.isUndefined(cachePromise) || params.cache === false) {
              if(/\.css[^\.]*$/.test(path) && cssFiles.indexOf(path) === -1) {
                cssFiles.push(path);
              } else if(/\.(htm|html)[^\.]*$/.test(path) && templatesFiles.indexOf(path) === -1) {
                templatesFiles.push(path);
              } else if(jsFiles.indexOf(path) === -1) {
                jsFiles.push(path);
              }
            } else if(cachePromise) {
              promises.push(cachePromise);
            }
          }

          if(params.serie) {
            pushFile(params.files.shift());
          } else {
            angular.forEach(params.files, function(path) {
              pushFile(path);
            });
          }

          if(cssFiles.length > 0) {
            var cssDeferred = $q.defer();
            cssLoader(cssFiles, function(err) {
              if(angular.isDefined(err) && cssLoader.hasOwnProperty('ocLazyLoadLoader')) {
                $log.error(err);
                cssDeferred.reject(err);
              } else {
                cssDeferred.resolve();
              }
            }, params);
            promises.push(cssDeferred.promise);
          }

          if(templatesFiles.length > 0) {
            var templatesDeferred = $q.defer();
            templatesLoader(templatesFiles, function(err) {
              if(angular.isDefined(err) && templatesLoader.hasOwnProperty('ocLazyLoadLoader')) {
                $log.error(err);
                templatesDeferred.reject(err);
              } else {
                templatesDeferred.resolve();
              }
            }, params);
            promises.push(templatesDeferred.promise);
          }

          if(jsFiles.length > 0) {
            var jsDeferred = $q.defer();
            jsLoader(jsFiles, function(err) {
              if(angular.isDefined(err) && jsLoader.hasOwnProperty('ocLazyLoadLoader')) {
                $log.error(err);
                jsDeferred.reject(err);
              } else {
                jsDeferred.resolve();
              }
            }, params);
            promises.push(jsDeferred.promise);
          }

          if(params.serie && params.files.length > 0) {
            return $q.all(promises).then(function success() {
              return filesLoader(config, params);
            });
          } else {
            return $q.all(promises);
          }
        }

        return {
          /**
           * Let you get a module config object
           * @param moduleName String the name of the module
           * @returns {*}
           */
          getModuleConfig: function(moduleName) {
            if(!angular.isString(moduleName)) {
              throw new Error('You need to give the name of the module to get');
            }
            if(!modules[moduleName]) {
              return null;
            }
            return modules[moduleName];
          },

          /**
           * Let you define a module config object
           * @param moduleConfig Object the module config object
           * @returns {*}
           */
          setModuleConfig: function(moduleConfig) {
            if(!angular.isObject(moduleConfig)) {
              throw new Error('You need to give the module config object to set');
            }
            modules[moduleConfig.name] = moduleConfig;
            return moduleConfig;
          },

          /**
           * Returns the list of loaded modules
           * @returns {string[]}
           */
          getModules: function() {
            return regModules;
          },

          /**
           * Let you check if a module has been loaded into Angular or not
           * @param modulesNames String/Object a module name, or a list of module names
           * @returns {boolean}
           */
          isLoaded: function(modulesNames) {
            var moduleLoaded = function(module) {
              var isLoaded = regModules.indexOf(module) > -1;
              if(!isLoaded) {
                isLoaded = !!moduleExists(module);
              }
              return isLoaded;
            }
            if(angular.isString(modulesNames)) {
              modulesNames = [modulesNames];
            }
            if(angular.isArray(modulesNames)) {
              var i, len;
              for(i = 0, len = modulesNames.length; i < len; i++) {
                if(!moduleLoaded(modulesNames[i])) {
                  return false;
                }
              }
              return true;
            } else {
              throw new Error('You need to define the module(s) name(s)');
            }
          },

          /**
           * Load a module or a list of modules into Angular
           * @param module Mixed the name of a predefined module config object, or a module config object, or an array of either
           * @param params Object optional parameters
           * @returns promise
           */
          load: function(module, params) {
            var self = this,
              config = null,
              moduleCache = [],
              deferredList = [],
              deferred = $q.defer(),
              moduleName,
              errText;

            if(angular.isUndefined(params)) {
              params = {};
            }

            // If module is an array, break it down
            if(angular.isArray(module)) {
              // Resubmit each entry as a single module
              angular.forEach(module, function(m) {
                if(m) {
                  deferredList.push(self.load(m, params));
                }
              });

              // Resolve the promise once everything has loaded
              $q.all(deferredList).then(function success() {
                deferred.resolve(module);
              }, function error(err) {
                deferred.reject(err);
              });

              return deferred.promise;
            }

            moduleName = getModuleName(module);

            // Get or Set a configuration depending on what was passed in
            if(typeof module === 'string') {
              config = self.getModuleConfig(module);
              if(!config) {
                config = {
                  files: [module]
                };
                moduleName = null;
              }
            } else if(typeof module === 'object') {
              config = self.setModuleConfig(module);
            }

            if(config === null) {
              errText = 'Module "' + moduleName + '" is not configured, cannot load.';
              $log.error(errText);
              deferred.reject(new Error(errText));
            } else {
              // deprecated
              if(angular.isDefined(config.template)) {
                if(angular.isUndefined(config.files)) {
                  config.files = [];
                }
                if(angular.isString(config.template)) {
                  config.files.push(config.template);
                } else if(angular.isArray(config.template)) {
                  config.files.concat(config.template);
                }
              }
            }

            moduleCache.push = function(value) {
              if(this.indexOf(value) === -1) {
                Array.prototype.push.apply(this, arguments);
              }
            };

            // If this module has been loaded before, re-use it.
            if(angular.isDefined(moduleName) && moduleExists(moduleName) && regModules.indexOf(moduleName) !== -1) {
              moduleCache.push(moduleName);

              // if we don't want to load new files, resolve here
              if(angular.isUndefined(config.files)) {
                deferred.resolve();
                return deferred.promise;
              }
            }

            var localParams = {};
            angular.extend(localParams, params, config);

            var loadDependencies = function loadDependencies(module) {
              var moduleName,
                loadedModule,
                requires,
                diff,
                promisesList = [];

              moduleName = getModuleName(module);
              if(moduleName === null) {
                return $q.when();
              } else {
                try {
                  loadedModule = getModule(moduleName);
                } catch(e) {
                  var deferred = $q.defer();
                  $log.error(e.message);
                  deferred.reject(e);
                  return deferred.promise;
                }
                requires = getRequires(loadedModule);
              }

              angular.forEach(requires, function(requireEntry) {
                // If no configuration is provided, try and find one from a previous load.
                // If there isn't one, bail and let the normal flow run
                if(typeof requireEntry === 'string') {
                  var config = self.getModuleConfig(requireEntry);
                  if(config === null) {
                    moduleCache.push(requireEntry); // We don't know about this module, but something else might, so push it anyway.
                    return;
                  }
                  requireEntry = config;
                }

                // Check if this dependency has been loaded previously
                if(moduleExists(requireEntry.name)) {
                  if(typeof module !== 'string') {
                    // compare against the already loaded module to see if the new definition adds any new files
                    diff = requireEntry.files.filter(function(n) {
                      return self.getModuleConfig(requireEntry.name).files.indexOf(n) < 0;
                    });

                    // If the module was redefined, advise via the console
                    if(diff.length !== 0) {
                      $log.warn('Module "', moduleName, '" attempted to redefine configuration for dependency. "', requireEntry.name, '"\n Additional Files Loaded:', diff);
                    }

                    // Push everything to the file loader, it will weed out the duplicates.
                    promisesList.push(filesLoader(requireEntry.files, localParams).then(function() {
                      return loadDependencies(requireEntry);
                    }));
                  }
                  return;
                } else if(typeof requireEntry === 'object') {
                  if(requireEntry.hasOwnProperty('name') && requireEntry['name']) {
                    // The dependency doesn't exist in the module cache and is a new configuration, so store and push it.
                    self.setModuleConfig(requireEntry);
                    moduleCache.push(requireEntry['name']);
                  }

                  // CSS Loading Handler
                  if(requireEntry.hasOwnProperty('css') && requireEntry['css'].length !== 0) {
                    // Locate the document insertion point
                    angular.forEach(requireEntry['css'], function(path) {
                      buildElement('css', path, localParams);
                    });
                  }
                  // CSS End.
                }

                // Check if the dependency has any files that need to be loaded. If there are, push a new promise to the promise list.
                if(requireEntry.hasOwnProperty('files') && requireEntry.files.length !== 0) {
                  if(requireEntry.files) {
                    promisesList.push(filesLoader(requireEntry, localParams).then(function() {
                      return loadDependencies(requireEntry);
                    }));
                  }
                }
              });

              // Create a wrapper promise to watch the promise list and resolve it once everything is done.
              return $q.all(promisesList);
            }

            filesLoader(config, localParams).then(function success() {
              if(moduleName === null) {
                deferred.resolve(module);
              } else {
                moduleCache.push(moduleName);
                loadDependencies(moduleName).then(function success() {
                  try {
                    justLoaded = [];
                    register(providers, moduleCache, localParams);
                  } catch(e) {
                    $log.error(e.message);
                    deferred.reject(e);
                    return;
                  }
                  deferred.resolve(module);
                }, function error(err) {
                  deferred.reject(err);
                });
              }
            }, function error(err) {
              deferred.reject(err);
            });

            return deferred.promise;
          }
        };
      }];

      this.config = function(config) {
        if(angular.isDefined(config.jsLoader) || angular.isDefined(config.asyncLoader)) {
          if(!angular.isFunction(config.jsLoader || config.asyncLoader)) {
            throw('The js loader needs to be a function');
          }
          jsLoader = config.jsLoader || config.asyncLoader;
        }

        if(angular.isDefined(config.cssLoader)) {
          if(!angular.isFunction(config.cssLoader)) {
            throw('The css loader needs to be a function');
          }
          cssLoader = config.cssLoader;
        }

        if(angular.isDefined(config.templatesLoader)) {
          if(!angular.isFunction(config.templatesLoader)) {
            throw('The template loader needs to be a function');
          }
          templatesLoader = config.templatesLoader;
        }

        // for bootstrap apps, we need to define the main module name
        if(angular.isDefined(config.loadedModules)) {
          var addRegModule = function(loadedModule) {
            if(regModules.indexOf(loadedModule) < 0) {
              regModules.push(loadedModule);
              angular.forEach(angular.module(loadedModule).requires, addRegModule);
            }
          };
          angular.forEach(config.loadedModules, addRegModule);
        }

        // If we want to define modules configs
        if(angular.isDefined(config.modules)) {
          if(angular.isArray(config.modules)) {
            angular.forEach(config.modules, function(moduleConfig) {
              modules[moduleConfig.name] = moduleConfig;
            });
          } else {
            modules[config.modules.name] = config.modules;
          }
        }

        if(angular.isDefined(config.debug)) {
          debug = config.debug;
        }

        if(angular.isDefined(config.events)) {
          events = config.events;
        }
      };
    }]);

  ocLazyLoad.directive('ocLazyLoad', ['$ocLazyLoad', '$compile', '$animate', '$parse',
    function($ocLazyLoad, $compile, $animate, $parse) {
      return {
        restrict: 'A',
        terminal: true,
        priority: 1000,
        compile: function(element, attrs) {
          // we store the content and remove it before compilation
          var content = element[0].innerHTML;
          element.html('');

          return function($scope, $element, $attr) {
            var model = $parse($attr.ocLazyLoad);
            $scope.$watch(function() {
              // it can be a module name (string), an object, an array, or a scope reference to any of this
              return model($scope) || $attr.ocLazyLoad;
            }, function(moduleName) {
              if(angular.isDefined(moduleName)) {
                $ocLazyLoad.load(moduleName).then(function success(moduleConfig) {
                  $animate.enter($compile(content)($scope), null, $element);
                });
              }
            }, true);
          };
        }
      };
    }]);

  /**
   * Get the list of required modules/services/... for this module
   * @param module
   * @returns {Array}
   */
  function getRequires(module) {
    var requires = [];
    angular.forEach(module.requires, function(requireModule) {
      if(regModules.indexOf(requireModule) === -1) {
        requires.push(requireModule);
      }
    });
    return requires;
  }

  /**
   * Check if a module exists and returns it if it does
   * @param moduleName
   * @returns {boolean}
   */
  function moduleExists(moduleName) {
    try {
      return angular.module(moduleName);
    } catch(e) {
      if(/No module/.test(e) || (e.message.indexOf('$injector:nomod') > -1)) {
        return false;
      }
    }
  }

  function getModule(moduleName) {
    try {
      return angular.module(moduleName);
    } catch(e) {
      // this error message really suxx
      if(/No module/.test(e) || (e.message.indexOf('$injector:nomod') > -1)) {
        e.message = 'The module "' + moduleName + '" that you are trying to load does not exist. ' + e.message
      }
      throw e;
    }
  }

  function invokeQueue(providers, queue, moduleName, reconfig) {
    if(!queue) {
      return;
    }

    var i, len, args, provider;
    for(i = 0, len = queue.length; i < len; i++) {
      args = queue[i];
      if(angular.isArray(args)) {
        if(providers !== null) {
          if(providers.hasOwnProperty(args[0])) {
            provider = providers[args[0]];
          } else {
            throw new Error('unsupported provider ' + args[0]);
          }
        }
        var isNew = registerInvokeList(args, moduleName);
        if(args[1] !== 'invoke') {
          if(isNew && angular.isDefined(provider)) {
            provider[args[1]].apply(provider, args[2]);
          }
        } else { // config block
          var callInvoke = function(fct) {
            var invoked = regConfigs.indexOf(moduleName + '-' + fct);
            if(invoked === -1 || reconfig) {
              if(invoked === -1) {
                regConfigs.push(moduleName + '-' + fct);
              }
              if(angular.isDefined(provider)) {
                provider[args[1]].apply(provider, args[2]);
              }
            }
          }
          if(angular.isFunction(args[2][0])) {
            callInvoke(args[2][0]);
          } else if(angular.isArray(args[2][0])) {
            for(var j = 0, jlen = args[2][0].length; j < jlen; j++) {
              if(angular.isFunction(args[2][0][j])) {
                callInvoke(args[2][0][j]);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Register a new module and load it
   * @param providers
   * @param registerModules
   * @returns {*}
   */
  function register(providers, registerModules, params) {
    if(registerModules) {
      var k, r, moduleName, moduleFn, tempRunBlocks = [];
      for(k = registerModules.length - 1; k >= 0; k--) {
        moduleName = registerModules[k];
        if(typeof moduleName !== 'string') {
          moduleName = getModuleName(moduleName);
        }
        if(!moduleName || justLoaded.indexOf(moduleName) !== -1) {
          continue;
        }
        var newModule = regModules.indexOf(moduleName) === -1;
        moduleFn = angular.module(moduleName);
        if(newModule) { // new module
          regModules.push(moduleName);
          register(providers, moduleFn.requires, params);
        }
        if(moduleFn._runBlocks.length > 0) {
          // new run blocks detected! Replace the old ones (if existing)
          runBlocks[moduleName] = [];
          while(moduleFn._runBlocks.length > 0) {
            runBlocks[moduleName].push(moduleFn._runBlocks.shift());
          }
        }
        if(angular.isDefined(runBlocks[moduleName]) && (newModule || params.rerun)) {
          tempRunBlocks = tempRunBlocks.concat(runBlocks[moduleName]);
        }
        invokeQueue(providers, moduleFn._invokeQueue, moduleName, params.reconfig);
        invokeQueue(providers, moduleFn._configBlocks, moduleName, params.reconfig); // angular 1.3+
        broadcast(newModule ? 'ocLazyLoad.moduleLoaded' : 'ocLazyLoad.moduleReloaded', moduleName);
        registerModules.pop();
        justLoaded.push(moduleName);
      }
      // execute the run blocks at the end
      var instanceInjector = providers.getInstanceInjector();
      angular.forEach(tempRunBlocks, function(fn) {
        instanceInjector.invoke(fn);
      });
    }
  }

  /**
   * Register an invoke
   * @param args
   * @returns {*}
   */
  function registerInvokeList(args, moduleName) {
    var invokeList = args[2][0],
      type = args[1],
      newInvoke = false;
    if(angular.isUndefined(regInvokes[moduleName])) {
      regInvokes[moduleName] = {};
    }
    if(angular.isUndefined(regInvokes[moduleName][type])) {
      regInvokes[moduleName][type] = [];
    }
    var onInvoke = function(invokeName) {
      newInvoke = true;
      regInvokes[moduleName][type].push(invokeName);
      broadcast('ocLazyLoad.componentLoaded', [moduleName, type, invokeName]);
    }
    if(angular.isString(invokeList) && regInvokes[moduleName][type].indexOf(invokeList) === -1) {
      onInvoke(invokeList);
    } else if(angular.isObject(invokeList)) {
      angular.forEach(invokeList, function(invoke) {
        if(angular.isString(invoke) && regInvokes[moduleName][type].indexOf(invoke) === -1) {
          onInvoke(invoke);
        }
      });
    } else {
      return false;
    }
    return newInvoke;
  }

  function getModuleName(module) {
    var moduleName = null;
    if(angular.isString(module)) {
      moduleName = module;
    } else if(angular.isObject(module) && module.hasOwnProperty('name') && angular.isString(module.name)) {
      moduleName = module.name;
    }
    return moduleName;
  }

  /**
   * Get the list of existing registered modules
   * @param element
   */
  function init(element) {
    var elements = [element],
      appElement,
      moduleName,
      names = ['ng:app', 'ng-app', 'x-ng-app', 'data-ng-app'],
      NG_APP_CLASS_REGEXP = /\sng[:\-]app(:\s*([\w\d_]+);?)?\s/;

    function append(elm) {
      return (elm && elements.push(elm));
    }

    angular.forEach(names, function(name) {
      names[name] = true;
      append(document.getElementById(name));
      name = name.replace(':', '\\:');
      if(element[0].querySelectorAll) {
        angular.forEach(element[0].querySelectorAll('.' + name), append);
        angular.forEach(element[0].querySelectorAll('.' + name + '\\:'), append);
        angular.forEach(element[0].querySelectorAll('[' + name + ']'), append);
      }
    });

    //TODO: search the script tags for angular.bootstrap
    angular.forEach(elements, function(elm) {
      if(!appElement) {
        var className = ' ' + element.className + ' ';
        var match = NG_APP_CLASS_REGEXP.exec(className);
        if(match) {
          appElement = elm;
          moduleName = (match[2] || '').replace(/\s+/g, ',');
        } else {
          angular.forEach(elm.attributes, function(attr) {
            if(!appElement && names[attr.name]) {
              appElement = elm;
              moduleName = attr.value;
            }
          });
        }
      }
    });

    if(appElement) {
      (function addReg(moduleName) {
        if(regModules.indexOf(moduleName) === -1) {
          // register existing modules
          regModules.push(moduleName);
          var mainModule = angular.module(moduleName);

          // register existing components (directives, services, ...)
          invokeQueue(null, mainModule._invokeQueue, moduleName);
          invokeQueue(null, mainModule._configBlocks, moduleName); // angular 1.3+

          angular.forEach(mainModule.requires, addReg);
        }
      })(moduleName);
    }
  }

  // Array.indexOf polyfill for IE8
  if(!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {

      var k;

      // 1. Let O be the result of calling ToObject passing
      //    the this value as the argument.
      if(this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var O = Object(this);

      // 2. Let lenValue be the result of calling the Get
      //    internal method of O with the argument "length".
      // 3. Let len be ToUint32(lenValue).
      var len = O.length >>> 0;

      // 4. If len is 0, return -1.
      if(len === 0) {
        return -1;
      }

      // 5. If argument fromIndex was passed let n be
      //    ToInteger(fromIndex); else let n be 0.
      var n = +fromIndex || 0;

      if(Math.abs(n) === Infinity) {
        n = 0;
      }

      // 6. If n >= len, return -1.
      if(n >= len) {
        return -1;
      }

      // 7. If n >= 0, then Let k be n.
      // 8. Else, n<0, Let k be len - abs(n).
      //    If k is less than 0, then let k be 0.
      k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      // 9. Repeat, while k < len
      while(k < len) {
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
        if(k in O && O[k] === searchElement) {
          return k;
        }
        k++;
      }
      return -1;
    };
  }
})();
