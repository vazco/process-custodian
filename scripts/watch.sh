echo "> Watching transpiling ES2015"
echo ""
./node_modules/.bin/babel src --ignore __tests__ --out-dir ./dist --watch

