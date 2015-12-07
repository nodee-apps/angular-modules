
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