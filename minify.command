#!/bin/sh

targetdir="./"

thisdir="`dirname \"$0\"`"
cd "$thisdir" &&

#concat all
cat ./src/*.js > "$targetdir"ne-modules-all.js &&

#minify all
uglifyjs ./src/*.js \
-m toplevel,eval \
-r getClassValue,getObjValue,encode \
-c sequences,dead_code,drop_debugger,conditionals,comparisons,booleans,loops,unused,hoist_funs,hoist_vars,if_return,join_vars,cascade \
--source-map ./ne-modules-all.min.js.map \
--source-map-root ./ne-modules-all.min.js.map \
-o "$targetdir"ne-modules-all.min.js &&

#concat ne modules
cat ./src/ne-*.js ./src/oc-lazyload.js > "$targetdir"ne-modules.js &&

#minify ne modules
uglifyjs ./src/ne-*.js ./src/oc-lazyload.js \
-m toplevel,eval \
-r getClassValue,getObjValue,encode \
-c sequences,dead_code,drop_debugger,conditionals,comparisons,booleans,loops,unused,hoist_funs,hoist_vars,if_return,join_vars,cascade \
--source-map ./ne-modules.min.js.map \
--source-map-root ./ne-modules.min.js.map \
-o "$targetdir"ne-modules.min.js ||

# stop if error
read -p "Some error occured, press [Enter] key to exit..."