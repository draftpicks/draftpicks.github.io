(function() {
  var fileInput = document.getElementById('fileInput');
  var fileDisplayArea = document.getElementById('fileDisplayArea');
  var $preview = $('#card-preview');

  var cards = {},
      total = 0,
      datasetChanged = false,
      exampleId = 'eoLZXokxwy',
      dataset;

  var regex = {
    text: /text.*/,
    querystring: /\?.*/g,
    set: /-{6}\s[A-Z]{3}\s-{6}\s/,
    setReplace: /(-|\s)/g,
    pick: /Pack\s\d\spick\s\d/,
    pickReplace: /(Pack\s\d\spick\s)|:/g,
    card: /\s{4}[A-z|\s|,|'|-]*/,
    cardReplace: /^\s*/g,
    selected: /-->\s[A-z|\s|,|'|-]*/,
    selectedReplace: /-->\s/g
  };

  init();

  function init() {
    Parse.initialize("FM7yovFGN8hA03tobbBmAhURObre3VhKn0QFQTGG", "vE9OJoPg89IfILen7AtZOwmw3PBsIeF7ucS8sk5n");

    if (getParameterByName('id')) {
      preloadTable(getParameterByName('id'));
    }

    fileInput.addEventListener('change', function(e) {
      var files = fileInput.files;

      cards = {};
      total = files.length;

      for (var i = 0; i < total; i++) {
        readFile(files[i], i);
      }
    });

    $('.example').on('click', function(e) {
      e.preventDefault();
      preloadTable(exampleId);
    });

    $('#results').on('mouseover', '.card a', function() {
      var $card = $(this).parent(),
          card = $(this).text();
      $preview.show().find('img').attr('src', getImageLink(card));
    }).on('mouseout', '.card a', function() {
      $preview.hide();
    });
  }

  function preloadTable(id) {
    getDataset(id).then(function(resp) {
      setShareLink(resp.id);
      createTable(resp.attributes.data);
    });
  }

  function readFile(file, i) {
    if (file.type.match(regex.text)) {
      var reader = new FileReader();

      reader.onload = function(e) {
        processText(reader.result)

        if (i === total - 1) {
          datasetChanged = true;
          dataset = createDataset(cards);
          createTable(dataset);
          saveDataset(dataset).then(function(data) {
            setShareLink(data.id);
          });
        }
      }

      reader.readAsText(file);  
    } else {
      // fileDisplayArea.innerText = "File not supported!"
    }
  }

  function processText(text) {
    var lines = text.split('\n'),
        card,
        pick,
        set;

    lines.forEach(function(line) {
      if (regex.set.test(line)) {
        set = line.replace(regex.setReplace, '');
      }
      else if (regex.pick.test(line)) {
        pick = parseInt(line.replace(regex.pickReplace, ''), 10);
      }
      else if (set && regex.selected.test(line)) {
        card = line.replace(regex.selectedReplace, '');
        createEntry(cards, card, set, pick, true);
      }
      else if (set && regex.card.test(line)) {
        card = line.replace(regex.cardReplace, '');
        createEntry(cards, card, set, pick, false);
      }
    });

    return cards;
  }

  function createEntry(cards, card, set, pick, isSelected) {
    if (!cards[card]) {
      cards[card] = {
        set: set,
        picks: [],
        instances: []
      };
    }

    cards[card].instances.push(pick);

    if (isSelected) {
      cards[card].picks.push(pick);
    }
  }

  function createDataset(cards) {
    var dataset = [],
        card,
        pickCount,
        instanceCount,
        pickPercent,
        avgPick;

    for (var name in cards) {
      if (cards.hasOwnProperty(name)) {
        card = cards[name];
        pickCount = card.picks.length;
        instanceCount = card.instances.length;
        pickPercent = Math.round(10000 * pickCount / instanceCount) / 100;
        avgPick = calcAvg(card.picks);
        
        dataset.push([
          name,
          card.set,
          instanceCount,
          pickPercent,
          avgPick
        ]);
      }
    }

    return dataset;
  }

  function calcAvg(picks) {
    var count = picks.length;

    if (!count) {
      return 100;
    }

    return Math.round(picks.reduce(add) / count * 10) / 10;
  }

  function add(x, y) {
    return x + y;
  }

  function createTable(dataset) {
    $('#results').dataTable({
      data: dataset,
      autoWidth: true,
      destroy: true,
      responsive: true,
      columns: [
        { title: 'Card', width: '40%'},
        { title: 'Set', width: '15%'},
        { title: 'Available', width: '15%', type: 'num'},
        { title: 'Pick %', width: '15%', type: 'num'},
        { title: 'Avg Pick', width: '15%', type: 'num'}
      ],
      order: [[4, 'asc']],
      columnDefs: [
        { 
          targets: 0,
          render: function(data) {
            return '<a target="_blank" href="' + getImageLink(data) + '">' + data + '</a>';
          },
          className: 'card'
        }
      ]
    });
  }

  function getImageLink(card) {
    return 'http://gatherer.wizards.com/Handlers/Image.ashx?type=card&name=' + card;
  }

  function saveDataset(dataset) {
    var Cards = Parse.Object.extend("Cards");
    var cardObj = new Cards();

    cardObj.set('data', dataset);

    return cardObj.save();
  }

  function getDataset(id) {
    var Cards = Parse.Object.extend("Cards");
    var query = new Parse.Query(Cards);

    return query.get(id);
  }

  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function setShareLink(id) {
    var url = window.location.href.replace(regex.querystring, '') + '?id=' + id;
    $('#share').show();
    $('#share-link').show().html(url).attr('href', url);
  }
})();