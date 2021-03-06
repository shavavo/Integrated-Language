// Request data from popup.js

chrome.storage.sync.get({auto: false, language:'hy', difficulty:60, apiKey:"0", whitelist:[], listenerAdded: false}, function(items) {
  // Checks if current domain is on whitelist
  if ( items.whitelist.indexOf(window.location.host) != -1) {
    // Adds listener of onClick, sending the word and definition to be used in Quizlet API call in background.js
    if ( !items.listenerAdded ) {
      console.log("listener added");

      window.addEventListener("message", function() {
        console.log(event.data);
         var word = event.data[0];
         var definition = event.data[1];

        chrome.runtime.sendMessage({id:"sendingCard", word: word, def: definition});
      });

      chrome.storage.sync.set({'listenerAdded': true});
    }


    // Get HTML of entire site, used to restore in between changes
    $.ajax({ url: "", success: function(data) {

      //Extract <body> from HTML
      var x = data.search("<body");
      var y = data.search("</body>");

      document.body.innerHTML = data.substring(x, y+7);


      var language = items.language;
      var difficulty = items.difficulty;
      var translateAPIKey = items.apiKey;

      // Invisible div to measure pixel width of text
      var measure = document.getElementById("measure");

      // Get all paragraph elements
      var p = document.querySelectorAll("p");

      // Temporary array of nouns
      var nouns = [];

      // Store all nouns, index = paragraph number
      var pNouns = [];

      var translatedNouns = [];

      // Style for code tag
      function addStyleString(str) {
        var node = document.createElement('style');
        node.innerHTML = str;
        document.body.appendChild(node);
      }

      function addScript(str) {
        var node = document.createElement('script');
        node.innerHTML = str;
        document.body.appendChild(node);
      }

      addStyleString("span{font-size:1em}");
      addStyleString("span{padding:.2rem .4rem;border-radius:.25rem}");

      addScript("function extract(x, y){ var data = [x, y]; window.postMessage(data,'*'); } ")


      for(var i=0; i<p.length; i++){
        nouns = [];
        uniqueNouns = [];

        // Naturual Language Processor library: extracts nouns
        nouns = nlp(p[i].innerText).nouns().out('array');

        // Remove nouns that repeat
        var uniqueNouns = [];
        $.each(nouns, function(i, el){
          if(($.inArray(el, uniqueNouns) === -1) && (Math.floor(Math.random() * 100) + 1 <(100-(100-difficulty)))) {
            uniqueNouns.push(el);
          }
        });
        pNouns.push(uniqueNouns);

        // Call Google Translate API for all unique nouns
        for(var j=0; j<uniqueNouns.length; j++){
          //console.log(nouns[j]);
          (function(i, j){
            $.ajax({
              url:"https://translation.googleapis.com/language/translate/v2",
              data: {q: uniqueNouns[j], target:language, key:translateAPIKey},
              success: function(returnedData){
                //console.log(returnedData.data.translations[0].translatedText);


                var translatedNoun = returnedData.data.translations[0].translatedText;


                // Create HTML to inject
                var string = "<span onclick=\"extract(\'" + pNouns[i][j] + "\', \'" + returnedData.data.translations[0].translatedText + "\' ) \"  class='translateWord' id='ff"+ i +"_"+ j +"' onmouseover=\"this.innerHTML='"+ pNouns[i][j] +"';\" onmouseout=\"this.innerHTML='"+ returnedData.data.translations[0].translatedText +"';\"style='color: #010101; text-align:center; display: inline-block; margin:auto;'>"+ returnedData.data.translations[0].translatedText+"</span>";

                // Inject HTML
                p[i].innerHTML = p[i].innerHTML.replace(" "+pNouns[i][j]+" ", string);

                // Set width of code element to the one that has a bigger width
                code = document.getElementById("ff"+i+"_"+j);

                if(code){
                  code.innerHTML = pNouns[i][j];
                  width1 = code.clientWidth + 1;
                  code.innerHTML = translatedNoun;
                  width2 = code.clientWidth + 1;

                  if(width1>width2){
                    code.style.width= width1 + "px";
                  }
                  else {
                    code.style.width= width2 + "px";
                  }
                  code.innerHTML = translatedNoun;
                }
              }
            });
          })(i, j);
        }
      }
    } });
  }
});
