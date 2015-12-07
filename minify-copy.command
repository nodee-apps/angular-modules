#!/bin/sh

srcdir="./src"

thisdir="`dirname \"$0\"`"
cd "$thisdir" &&

# minify files
sh "$srcdir"/minify.command &&

# copy minified files from ne-modules
cp "$srcdir"/*.js "$thisdir" &&
cp "$srcdir"/*.map "$thisdir" ||

# stop if error
read -p "Some error occured, press [Enter] key to exit..."