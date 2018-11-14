agGrid.LicenseManager.setLicenseKey("Evaluation_License_Valid_Until__24_November_2018__MTU0MzAxNzYwMDAwMA==a39c92782187aa78196ed1593ccd1527");

var columnDefs = [];

// let the grid know which columns and what data to use
var gridOptions = {
  columnDefs: columnDefs,
  enableSorting: false,
  enableFilter: false,
  rowData: null,
  enableColResize: true,
  colResizeDefault: 'shift',
  suppressAggFuncInHeader: true,
  onFirstDataRendered: autoSize,
  onRowGroupOpened: autoSize,
  suppressRowClickSelection: true,
  rememberGroupStateWhenNewData: true,
  autoGroupColumnDef: {
    headerName:'',
    cellRendererParams: {
      suppressCount: true
    },
  },
  getRowHeight: function(params) {
    // console.log(params.node.key)
    if (params.node.key == null || params.node.key == " ") {
      //can't return 0 because of bug: https://github.com/ag-grid/ag-grid/issues/1678
      return 1
    } else {
      return 25
    }
  },
  getRowStyle: function(params){
    if (params.node.key == null || params.node.key == " ") {
      return {display:'none'}
    }
  },
};

// lookup the container we want the Grid to use
var eGridDiv = document.querySelector('#myGrid');

function sizeToFit() {
  gridOptions.api.sizeColumnsToFit();
}

function autoSize(params) {
  // console.log(params)
  gridOptions.columnApi.autoSizeAllColumns();
  // console.log('autoSized')
  if (gridOptions.api.gridPanel.eBodyContainer.scrollWidth < gridOptions.api.gridPanel.eBody.scrollWidth) {
    // console.log('Sizing to Fit')
    gridOptions.api.sizeColumnsToFit();
  }
}

// Custom aggregate functions
function customAgg(values) {
  // console.log('values',values)
  return 37;
}

looker.plugins.visualizations.add({
  id: "ag-grid",
  label: "ag-Grid",
  options: {
    default_open_groups: {
      type: "string",
      label: "Open Groups as Default",
      display: "radio",
      values: [
        {"Yes": "yes"},
        {"No": "no"}
      ],
      default: "no"
    }
  },
  create: function(element, config) {

    var css = element.innerHTML = `
      <style>
        #myGrid {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      </style>
    `;

    /* create the link element */
    function addCSS(link) {
      var linkElement = document.createElement('link');

      /* add attributes */
      linkElement.setAttribute('rel', 'stylesheet');
      linkElement.setAttribute('href', link);

      /* attach to the document head */
      document.getElementsByTagName('head')[0].appendChild(linkElement);
    }

    addCSS('https://unpkg.com/ag-grid-community/dist/styles/ag-grid.css');
    addCSS('https://unpkg.com/ag-grid-community/dist/styles/ag-theme-balham.css');

    // Create a container element to let us center the text.
    var container = element.appendChild(document.createElement("div"));
    container.id = "myGrid";
    container.className = "ag-theme-balham";

    // lookup the container we want the Grid to use
    var eGridDiv = document.querySelector('#myGrid');


    // create the grid passing in the div to use together with the columns & data we want to use
    new agGrid.Grid(eGridDiv, gridOptions);

  },

  updateAsync: function(data, element, config, queryResponse, details, done) {

    var columnDefs = []; 

    data_dimension_columns = queryResponse.fields.dimension_like;
    data_measure_columns = queryResponse.fields.measure_like;
    data_pivot_columns = queryResponse.fields.pivots;

    data_dimension_columns.forEach(createColumnDef);

    if (data_measure_columns.length > 0 ) {
      data_measure_columns.forEach(createMeasureColumnDef);
    }

    if (data_pivot_columns.length > 0 ) {
      data_pivot_columns.forEach(createPivotColumnDef);
    }

    function createColumnDef(item, index) {

      label = item.label_short;
      field = item.name
      field = field.split(".");

      columnDef = {
        headerName: label, 
        field: field[1], 
        rowGroup: true,
        hide: true,
        cellRenderer: function(params){
          return params.value;
        }
      }

      columnDefs.push(columnDef);

    }

    function createMeasureColumnDef(item, index) {
      label = item.label_short;
      field = item.name
      field = field.split(".");

      columnDef = {
        headerName: label, 
        field: field[1], 
        aggFunc: 'first',
        cellRenderer: function(params){
          return params.value;
        }
      }

      columnDefs.push(columnDef);

    }

    function createPivotColumnDef(item, index) {
      label = item.label_short;
      field = item.name
      field = field.split(".");
      columnDef = {
        headerName: label, 
        field: "pivot", 
        hide: true,
        pivot: true
      }

      gridOptions.columnApi.setPivotMode(true);

      columnDefs.unshift(columnDef);

    }
    gridOptions.api.setColumnDefs(columnDefs);

    // remap the new data in a better key, value pairing

    if (data_pivot_columns.length > 0 ) {

      data_m = [];
      for (var i = 0; i < data.length; i++) {

        dimensionObject = {};
        measureList = [];

        for (var property in data[i]) {

          Object.keys(data[i]).forEach(function(key,index) {
            var name = key.split(".");
            if ('value' in data[i][key]) {
              if (data[i][key].html != null && data[i][key].html) {
                // console.log(data[i][key][subKey].html);
                dimensionObject[name[1]] = data[i][key].html;
              } else {
                dimensionObject[name[1]] = data[i][key].value;
              }
            } else {
              
              Object.keys(data[i][key]).forEach(function(subKey,subIndex) {
                var pivotMeasure = {};
                
                // need to check if a timeperiod object already exists

                // check if any measures have been added, if empty create one
                if (measureList.length == 0) {
                  // adds the first subkey
                  pivotMeasure.pivot = subKey.split("|FIELD|")[0];
                  pivotMeasure[name[1]] = LookerCharts.Utils.htmlForCell(data[i][key][subKey]);
                } else {
                  var pivotValueNotInList = false;
                  measureList.forEach(function(measureObject) {
                    // if existing list, find the one with correct pivot field and add second measure
                    if (measureObject.pivot == subKey.split("|FIELD|")[0]) {
                      measureObject[name[1]] = LookerCharts.Utils.htmlForCell(data[i][key][subKey]);
                    } else {
                      if (subKey.includes("null")){
                        pivotMeasure.pivot = "∅";
                      } else {
                        pivotMeasure.pivot = subKey.split("|FIELD|")[0];
                      }
                      pivotMeasure[name[1]] = LookerCharts.Utils.htmlForCell(data[i][key][subKey]);
                    }
                  });
                }
                // only add to list if pivotMeasure has stuff and measure List is empty
                if (_.isEmpty(pivotMeasure) == false && measureList.length == 0) {
                  measureList.push(pivotMeasure);
                } else {
                  // Figure out if the pivot value is already on the list
                  var existsOnList = false;
                  measureList.forEach(function(measureObject) {
                    if(measureObject.pivot == pivotMeasure.pivot) {
                      existsOnList = true;
                    }
                  });
                  // if the pivot value is not on the list add it
                  if (existsOnList == false) {
                    measureList.push(pivotMeasure);
                  }
                }
              });
            }
          });
        }
        for (var j = 0; j < measureList.length; j++) {
          var pivotRow = Object.assign({},dimensionObject,measureList[j]);
          data_m.push(pivotRow);
        }
      }
    } else {
      var data_m = _.map(data, function(value, key) {
        var obj = {};
        var newRow = _.map(value, function(objectValue, objectKey){
          var new_name = objectKey.split(".");
          obj[new_name[1]] = objectValue.value ? LookerCharts.Utils.htmlForCell(objectValue) : null;
        });
        return obj;
      });
    }

    // auto expand on load option
    if (config.default_open_groups == "yes") {
      gridOptions.groupDefaultExpanded = -1;
    } else {
      gridOptions.groupDefaultExpanded = 0;
    }

    gridOptions.api.setRowData(data_m);
    autoSize();
    
  }
})