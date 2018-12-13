var gdpArr = [];     // Array of year+quarter and GDP

// // Requirements for node.js //
// const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest; 
// const d3 = require('d3');
// const JSDOM = require( 'jsdom' ).JSDOM;

// // initialize a new document
// // wrapper is a generic HTML document serving as the base (not sure, if it is needed in your case)
// const jsdom = new JSDOM( 'index.html', { runScripts: "outside-only" } );

// // get a reference of the document object
// const document = jsdom.window.document;

/* no idea how to use node.js, need to review... */


/// REST API for to GET quarterly GDP ///
const newLocal = 'https://apps.bea.gov/api/data/?UserID=31F2E28F-779A-4F1B-A17F-BEEA76B647C8&method=GetData&DatasetName=NIPA&Frequency=Q&Year=ALL&TableName=T10105&ResultFormat=json';

let url = newLocal;

let req = new XMLHttpRequest();
req.open('GET', url, true);
req.send();
req.onload = () => {
    
    let json = JSON.parse(req.responseText);      // create var for parsed json file

    let dataList = (json.BEAAPI.Results.Data).filter(obj => obj.SeriesCode === "A191RC");    
                                                            // grab only GDP objects from table 

    gdpArr = dataList.map( obj => {     // iterate through data list and extract only TimePeriod + DataValue per obj

        let yearQuarter = obj.TimePeriod;   // tool tip string format for year

        let year = Number( yearQuarter.slice(0,4) ) + (yearQuarter.slice(5) * 0.25);  // actual number value of year that will be used for x-axis ///MIGHT NOT NEED. BAR GRAPH DOESNT NEED X PLACEMENT///
        let gdp = obj.DataValue;                          // gdp value (billions)
        gdp = parseFloat( gdp.replace(/,/g, '') );        // remove commas and convert to string to Number
        gdp = Math.round( (gdp / 1000) * 10) / 10;        // convert gdp from millions to billions and round to the first decimal place

        return [year, gdp, yearQuarter];  // add extracted data to gdpArr. Included a string version of yearQuarter for tool tip
    });

    for (var i = 0 ; i < gdpArr.length ; i++) {
        console.log(gdpArr[i]);
    }

    d3SetUp();
    addFooter();
    
};


/// D3 Bar Graph ///

d3SetUp = () => {

    const w = 900;     // width and height of the svg container
    const h = 500;  
    const padding = 50; // adds extra padding between svg container and graph
    
    const xScale = d3.scaleLinear()         // scale x values to proportionally with svg width
                    .domain( [d3.min(gdpArr, d => d[0]), d3.max(gdpArr, d => d[0])] )
                    .range( [padding, w - padding]);
    
    const yScale = d3.scaleLinear()         // scale y values to proportionally with svg height
                    .domain( [0, d3.max(gdpArr, (d) => d[1])] ) 
                    .range( [h - padding, padding] )
                
    const svg = d3.select('#main')          // create svg element and put it in main
                    .append('svg')
                    .attr('width', w)
                    .attr('height', h)


    let tooltip = d3.select('body')
                    .append('div')
                    .attr('id', 'tooltip')
                    .style('position', 'absolute')
                    .style('z-index', '10')
                    .style('visibility', 'hidden')
                    .text('a simple tooltip');
                    
    svg.selectAll('rect')   // create each bar in the bar graph
        .data(gdpArr)
        .enter()
        .append('rect')
        .attr('x', (d) => xScale(d[0]) )
        .attr('y', (d) => yScale(d[1]) )  // NOTE: y starts at top of bar, and height takes us to x axis
        .attr('width',2.5)
        .attr('height', (d) => h - padding - yScale(d[1]) )     // HOLY!!! Originally used only yScale(d[1])
        .attr('class', 'bar')                                   // think, d3 starts upper left. so h - padding = x-axis. Why minus d[1]!?
        .attr('data-date', d => d[2])   // give each bar custom data attributes: yearQuarter
        .attr('data-gdp', d => d[1])    //                                     : gdp
        .attr('fill', 'blue')           
        .on('mouseover', (d) => {

            // how come we don't declare here?
            period = d[2].slice(0,4) + ' ' + d[2].slice(4,6);   // time period in YYYY Q# format
            gdp = '$' +  d[1].toLocaleString(undefined, {maximumFractionDigits: 1}) + ' Billion';   

            tooltip.html(period + '<br>' + gdp);

            return tooltip.style('visibility', 'visible');

        })
        .on("mousemove", () => {
            return tooltip.style("top", yScale(h) +"px")
                            .style("left", (d3.event.pageX+10)+"px");
        })
        .on("mouseout", () => {
            return tooltip.style("visibility", "hidden");
        });
    
    // scaling for x and y axis //

    const xAxis = d3.axisBottom(xScale)
                    .tickValues(d3.range(1950, 2018, 5))        // sets the tick intervals of xAxis
                    .tickFormat(d3.format('i'))                 // format to integers only

    const yAxis = d3.axisLeft(yScale);
    
    svg.append('g')     // creates the x axis. translate it to the height of svg container
        .attr('transform', 'translate(0,' + (h - padding) + ')')
        .call(xAxis)
        .attr('class', 'tick')
        .attr('id', 'x-axis');

    svg.append('text')  // create x label
        .attr('x', w / 2)
        .attr('y', h)
        .attr('id', 'x-label')
        .style('text-anchor', 'middle')
        .text('Time Period');
        
    svg.append('g')     // creates y axis. translate it to the where beginning of x coord is lined up
        .attr('transform', 'translate(' + padding + ', 0)')
        .call(yAxis)
        .attr('class', 'tick')
        .attr('id', 'y-axis');

    svg.append('text')  // create y label
        .attr('x', 0 - h / 2  )
        .attr('y', padding * 5 / 4)
        .attr('dy', '1em')
        .attr('id', 'y-label')
        .attr('transform', 'rotate(-90)')
        .style('text-anchor', 'middle')
        .text('Gross Domestic Product');

};

addFooter = () => {

    let footer = document.createElement('P');   // <p> elem for footer
    let text = document.createTextNode('More Information: http://www.bea.gov/national/pdf/nipaguid.pdf');   // text for footer
    footer.appendChild(text);                   // set text node as child to <p> elem
    footer.setAttribute('id', 'footer');        // set id to 'footer'

    document.getElementById('main').appendChild(footer);   // add <p> to main div

}