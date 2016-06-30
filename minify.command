#!/bin/sh

targetdir="./"

thisdir="`dirname \"$0\"`"
cd "$thisdir" &&

##
# Only NE modules
##

# concat ne modules
cat ./src/ne-*.js ./src/oc-lazyload.js > "$targetdir"ne-modules.js &&

# minify ne modules
uglifyjs "$targetdir"ne-modules.js \
-m toplevel,eval \
-r getClassValue,getObjValue,encode \
-c sequences,dead_code,drop_debugger,conditionals,comparisons,booleans,loops,unused,hoist_funs,hoist_vars,if_return,join_vars,cascade \
--source-map "$targetdir"ne-modules.min.js.map \
--source-map-root "$targetdir"ne-modules.min.js.map \
-o "$targetdir"ne-modules.min.js &&


##
# NE modules with angular bootstrap ui
##

# concat ne modules with bootstrap ui
cat ./src/ne-*.js ./src/oc-lazyload.js ./src/ui-*.js > "$targetdir"ne-modules-ui.js &&

# minify ne modules with bootstrap ui
uglifyjs "$targetdir"ne-modules-ui.js \
-m toplevel,eval \
-r getClassValue,getObjValue,encode \
-c sequences,dead_code,drop_debugger,conditionals,comparisons,booleans,loops,unused,hoist_funs,hoist_vars,if_return,join_vars,cascade \
--source-map "$targetdir"ne-modules-ui.min.js.map \
--source-map-root "$targetdir"ne-modules-ui.min.js.map \
-o "$targetdir"ne-modules-ui.min.js &&

##
# All modules
##

# concat all
cat ./src/*.js > "$targetdir"ne-modules-all.js &&

# minify all
uglifyjs "$targetdir"ne-modules-all.js \
-m toplevel,eval \
-r getClassValue,getObjValue,encode \
-c sequences,dead_code,drop_debugger,conditionals,comparisons,booleans,loops,unused,hoist_funs,hoist_vars,if_return,join_vars,cascade \
--source-map "$targetdir"ne-modules-all.min.js.map \
--source-map-root "$targetdir"ne-modules-all.min.js.map \
-o "$targetdir"ne-modules-all.min.js ||

# stop if error
read -p "Some error occured, press [Enter] key to exit..."