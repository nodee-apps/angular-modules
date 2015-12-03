/**
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