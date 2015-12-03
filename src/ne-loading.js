
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