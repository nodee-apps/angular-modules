
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
    
    this.translate = function(original){
        if(original===undefined || original===null) return '';
        var orig = original+'';
        var lang = langs[currentLangId] || {};
        return lang[orig] || langs['default'][orig] || orig || '';
    };
    
    this.language = function(langId){
        if(langId) currentLangId = langId;
        return currentLangId;
    };
    
    this.set = this.translations = function(langId, original, translated){
        if(arguments.length===3){
            langs[langId] = langs[langId] || {};
            langs[langId][original] = translated;
        }
        else if(arguments.length===2){
            langs[langId] = langs[langId] || {};
            angular.extend(langs[langId], original);
        }
    };
    
    this.$get = function() {
        return this;
    };
    
    return this;
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