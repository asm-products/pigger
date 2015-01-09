cd ../
meteor create assembly-pigger
cd pigger
cp pigger.css pigger.html pigger.js ../assembly-pigger
cd ../
rm -r -f pigger
cd assembly-pigger
rm assembly-pigger.css assembly-pigger.html assembly-pigger.js
mv pigger.css assembly-pigger.css
mv pigger.html assembly-pigger.html
mv pigger.js assembly-pigger.js
meteor remove autopublish
meteor remove insecure
meteor add accounts-password accounts-ui jquery kevohagan:sweetalert nooitaf:semantic-ui
