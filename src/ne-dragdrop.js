/**
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
            var dragData;

            // exec drag start expression
            if(attrs.drag) dragData = scope.$apply(attrs.drag);

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData || new Date()));
            this.classList.add('dragged');
            
            return false;
        }
        
        function removeDragClass(e) {
            this.classList.remove('dragged');

            // exec drag end expression
            if(attrs.dragEnd) scope.$apply(attrs.dragEnd);

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
                el.removeEventListener('dragstart', addDragClass);
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

            if(!attrs.droppable || (attrs.droppable && scope.$apply(attrs.droppable))) {
                this.classList.add('dragover');
            }
            return false;
        }
        el.addEventListener('dragover', dragover);
        
        function dragenter(e) {
            if(!attrs.droppable || (attrs.droppable && scope.$apply(attrs.droppable))) {
                this.classList.add('dragover');
            }
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
          
            var data;
            
            try {
                data = JSON.parse(document.getElementById(e.dataTransfer.getData('text'))+'');
            }
            catch(err){}

            // call the passed drop function
            if(attrs.drop && (!attrs.droppable || (attrs.droppable && scope.$apply(attrs.droppable)))) {
                scope.$eval(attrs.drop, { data:data });
                scope.$apply();
            }

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