//TODO: use HTML5 Local Storage to cache results
//      check to see if turn exists in local storage before AJAX --> server request
//        - Also pre-fetch next 10 turns and save them in localStorage for you. 
//      clear game data from localstorage at start
//	save the last position you were at in each game, so if you exit and come back the state in the game is preserved
//;(function(exports){

    var gameLog = []; 
    var nodeList = []; 
    var linkList = [];
    var playerList = {}; 
    var colors = d3.shuffle(["#4C92C3", "#ff7f0e", "#2ca02c", "#d62728", "#e377c2", "#ffff00"]); 
    var gameID; 
    var broadcasts; 
    var force; 
    
    //fixed positions for overlay onto risk board
  
    var fixedPositions = {
        "alaska" : {x: 50, y:30, forced:true},
        "northwest territory" : {x: 150, y:70},
        "kamchatka" : {x: 700, y:30, forced:true},
        "central america" : {x: 130, y:250},
        "central africa" : {x: 400, y:375},
        "north africa" : {x: 344, y:304, forced:true},
        "eastern united states" : {x: 190, y:235, forced:true},
        "western united states" : {x: 100, y:225, forced:true},
        "greenland" : {x: 250, y:50, forced:true},
        "indonesia" : {x: 600, y:375},
        "eastern australia" : {x: 690, y:410},
        "western australia" : {x: 630, y:440, forced:true},
        "new guinea" : {x: 690, y:350},
        "alberta" : {x: 115, y:125},
        "ontario" : {x: 175, y:135},
        "eastern canada" : {x: 230, y:125},
        "brazil" : {x: 238, y:332, forced:true},
        "india" : {x: 575, y:350, forced:true},
        "afghanistan" : {x: 500, y:200},
        "middle east" : {x: 450, y:250},
        "southeast asia" : {x: 615, y:290},
        "madagascar" : {x: 475, y:440, forced:true},
        "argentina" : {x: 250, y:500, forced:true},
        "yakutsk" : {x: 600, y:65, forced:true},
        "japan" : {x: 735, y:140, forced:true},
        "china" : {x: 590, y:230},
        "mongolia" : {x: 700, y:240, forced:true},
        "ural" : {x: 515, y:130},
        "irkutsk" : {x: 595, y:115},
        "siberia" : {x: 550, y:80},
        "russia" : {x: 480, y:100, forced:true},
        "iceland" : {x: 320, y:85},
        "northern europe" : {x: 375, y:170},
        "southern europe" : {x: 375, y:215},
        "south africa" : {x: 400, y:500, forced:true},
        "western europe" : {x: 325, y:230},
        "great britain" : {x: 300, y:165, forced:true},
        "scandinavia" : {x: 385, y:85, forced:true},
        "east africa" : {x: 450, y:350},
        "venezuela" : {x:185, y:278},
        "peru" : {x:170, y:350},
        "egypt" : {x:400, y:290},
    };
  
    var startFromDB = function () {
        makeSlider(); 
        initializeStatusDisplay(); 
    };

    $(document).ready(function(){
        createGraph(doStuff); 
        startFromDB(); 
    });

    var createGraph = function (callback) {
        $.getJSON("/static/board_graph.json", function(data) {
            //add nodes (countries) first
            $.each(data, function (key, continent) {
                var countries = continent["countries"]; 
                $.each(countries, function(name, data) {
                    var node = {};
                    node.name = name;
                    var borderCountries = data["border countries"];
                    if (fixedPositions[node.name]) {
                        node.x=fixedPositions[node.name]["x"]; 
                        node.y=fixedPositions[node.name]["y"]; 
                        node.fixed=fixedPositions[node.name]["forced"] || false; 
                    }
                    node.continent = key; 
                    node.owner = null; 
                    node.troops = 0;
                    node.borderCountries = borderCountries; 
                    nodeList.push(node);
                });
            });
            console.log("node list created"); 

            //then create links between them based on border countries
            for (var i = 0; i<nodeList.length; i++) {
                var node = nodeList[i]; 
                borderCountries = node.borderCountries; 
                for (var j = 0; j<borderCountries.length; j++) {
                    for (var k = 0; k<nodeList.length; k++) {
                        if (nodeList[k].name == borderCountries[j]) {
                            var link = {};
                            link.source = i; 
                            link.target = k; 
                            var linkExists = false; 
                            for (var l=0; l<linkList.length; l++) {
                                if (link.source == linkList[l].target && link.target == linkList[l].source) {
                                    linkExists = true; 
                                }
                            } 
                            if (!linkExists) {
                                linkList.push(link); 
                            }
                        }
                    }
                }
            }
            console.log("link list created"); 
            callback();
        });  
    }
    
    var initializeStatusDisplay = function() {
        d3.json("/game/" + gameID + "/1", function(data) {
            var players = data["players"]; 
            var index = 0; 
            for (player in players) {
                playerList[player] = index; 
                index ++; 
                var playerP = d3.select("#gameStats").append("p")
                    .text(player + ": cards: " + players[player]["card"]) 
                    .style("color", colors[playerList[player]])
                    .style("font-weight", "bold")
                    .attr("id", player.split(" ").join(""));
            }
            var lastAction = d3.select("#gameStats").append("p")
                .text("Last Action")
                .attr("id", "lastAction"); 
            var lastActionResults = d3.select("#gameStats").append("p")
                .text("Results")
                .attr("id", "lastActionResults"); 
            var asdf = d3.select("#gameStats").append("p")
                .text("asdf")
                .attr("id", "asdf"); 
        });
    };
        
    function doStuff() {    
        var height = 600; 
        var width = 800; 
	
	var conts = {
            "europe": "#0044FF",
            "asia": "#00A231",
            "north america": "#F7FF01",
            "south america": "#FF0000",
            "africa": "#FF8901",
            "australia": "#9D00A2"
        };
        var groups = d3.nest().key(function(d) {return d.continent}).entries(nodeList);
        var groupPath = function(d) {
            return "M" +
                d3.geom.hull(d.values.map(function(i) {return [i.x, i.y]; }))
                    .join("L")
                + "Z";
        };

        force = d3.layout.force()
            .nodes(nodeList)
            .links(linkList)
            .size([width, height])
            .linkDistance(30)
            .charge(-500)
            .linkStrength(0.7)
            .on("tick", tick)
            .start(); 
            
        // Create D3 Layout Container
        var svg = d3.select("#map").append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "z-index: 1")
            .attr("id", "d3Layout"); 
   
        //Create br so background image is positioned correctly
        d3.select("#map").append("br"); 
 
        //create element for risk board background image
        //var background = d3.select("#map").append("svg")
        //    .attr("width", width)
        //    .attr("height", height)
        //    .attr("id", "background"); 

	var continentBoundary = svg.selectAll("path.group")
                .data(groups)
                    .attr("d", groupPath)
                    .attr("class", "group")
                .enter().insert("path", "circle")
                    .style("fill", function(d) {return conts[d.key];})
                    .attr("class", "group")
                    .style("stroke", function(d) {return conts[d.key];})
                    .attr("class", "group")
                    .style("stroke-width", 50)
                    .style("stroke-linejoin", "round")
                    .style("opacity", 0.4)
                    .attr("d", groupPath);


    //add links 
        var path = svg.append("svg:g").selectAll("path.link")
            .data(force.links())
            .enter().append("svg:path")
            .attr("class", "link")
    //define nodes?
        var node = svg.selectAll(".node")
            .data(force.nodes())
            .enter().append("g")
            .attr("class", "node")
            .attr("value", 0)
            .attr("owner", null)
            .attr("id", function(d) {
                var id = d.name; 
                return id.split(" ").join(""); 
            })
            //.call(force.drag); 
    //add nodes?
        
        var circle = node.append("circle")
            .attr("r", 7)
            .attr("class", "countryCircle")
            .style("stroke", "black"); 

        //add text?
        var label = node.append("text")
            .attr("x", 12)
            .classed ("label", true)
            .style("fill", "black")
            .attr("dy", ".35em")
            .text(function(d) {return d.name;});

        // add troop count number
        var troopCount = node.append("text")
            .attr("dx", -3)
            .attr("dy", 3)
            .text(function(d) {return d.troops;}); 

        function tick() {
	    continentBoundary.attr("d", groupPath); 

            path.attr("d", function(d) {
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                return "M" + 
                    d.source.x + "," + 
                    d.source.y + "L" + 
                    d.target.x + "," + 
                    d.target.y;
            });

            circle.attr("r", function(d) {
                var troops = d.troops || 1; 
                var radius = 7 * (Math.sqrt(troops));
                return radius; 
            });
            
            node.attr("transform", function(d) { 
                return "translate(" + d.x + "," + d.y + ")"; 
            });
            
            troopCount.text(function(d) {return d.troops;}); 
            
            label.attr("x", function(d) {
                var troops = d.troops || 1; 
                var circleRadius = 7 * (Math.sqrt(troops));
                var offset = 2 + circleRadius; 
                return offset;
            }); 
        }
        console.log("graph created"); 
    }; 

    var makeSlider = function() {
        var sliderMax = broadcasts-1;
	var defaultSpeed = 250;
	var speed = defaultSpeed;  
	var factor = 1;  
        $(function() {
            $("#beginning").button({
				text:false, 
				icons: {primary: "ui-icon-seek-start"}
			}).click(function(event) {
                pause($("#pause").data("intervalID")); 
				autoSlide(1); 
            });
            $("#rewind").button({
				text:false, 
				icons: {primary: "ui-icon-seek-prev"}
			}).click(function(event) {
                pause($("#pause").data("intervalID"));
			factor = -1;  
	        	$("#pause").data("intervalID", play(speed, factor));    
            });
            $("#play").button({
				text:false, 
				icons: {primary: "ui-icon-play"}
			}).click(function(event) {
                pause($("#pause").data("intervalID")); 
		factor = 1; 
                $("#pause").data("intervalID", play(speed));    
            });
            $("#pause").button({
				text:false, 
				icons: {primary: "ui-icon-pause"}
			}).click(function(event) {
                pause($("#pause").data("intervalID"));
                $("#pause").data("intervalID", null);
            });
            $("#nextTurn").button({
				text:false, 
				icons: {primary: "ui-icon-arrowthick-1-e"}
			}).click(function(event) {
                pause($("#pause").data("intervalID"));
		autoSlide(); 
            });
            $("#previousTurn").button({
				text:false, 
				icons: {primary: "ui-icon-arrowthick-1-w"}
			}).click(function(event) {
                pause($("#pause").data("intervalID"));
		autoSlide(null, -1); 
            });
            $("#end").button({
				text:false, 
				icons: {primary: "ui-icon-seek-end"}
			}).click(function(event) {
                pause($("#pause").data("intervalID")); 
				autoSlide(sliderMax); 
            });
		$("#playSpeed").buttonset();
		$('input[name=playSpeed]:radio').click(function(event) {
			var multiplier = $('input[name=playSpeed]:radio:checked').val();
			speed = defaultSpeed / multiplier;  
			if ($("#pause").data("intervalID")) { 
				pause($("#pause").data("intervalID")); 
				$("#pause").data("intervalID", play(speed, factor));
			}    
		});
        }); 
        $(function() {
            $("#slider").slider({
                min:0, 
                max: sliderMax,
                slide: function (event, ui) {
                    $.getJSON("/game/" + gameID + "/" + ui.value, function(data) {
                        $("#turn").text("Turn: " + data["turn"]);
                        updateNodes(data); 
                        updateStats(data); 
                    }); 
                }
            });
            $("#turn").text("Turn: 0 - Initial Deployment");
        });
    }

    var updateStats = function(game) {
        var countries = game["countries"];
        var players= game["players"];
        var lastAction = game["last_action"];
        for (player in players) {
            var playerName = player.split(" ").join("");
            var totalTroops = 0; 
            var countryCount = 0; 
            for (countryName in countries) {
                if(countries[countryName]["owner"] == player) {
                    countryCount++; 
                    totalTroops += countries[countryName]["troops"]; 
                }
            };
            $("#" +playerName).text(player + " -- cards: " + players[player]["cards"] + " -- troops: " + totalTroops); 
        };
        var actions = ["chose", "deployed", "attacked", "reinforced", "defeated", "spent", "neutral"];
        var pos = (actions.map(function(x) {return lastAction.indexOf(x);})); 
        var action = actions[pos.indexOf(d3.max(pos))];
        var lhs = lastAction.slice(0, lastAction.indexOf(action));
        var rhs = lastAction.slice(lastAction.indexOf(action) + action.length);
        var parsedAction;
        if (action == "attacked") {
            actionAttacked(countries, lhs, rhs);
        } else if (action == "deployed") {
            actionDeployed(countries, lhs, rhs);
        } else if (action == "reinforced") {
            actionReinforced(countries, lhs, rhs);
        } else if (action == "defeated") {
            actionDefeated(countries, lhs, rhs);
        } else if (action == "spent") {
            actionSpent(countries, lhs, rhs);
        } else if (action == "chose") {
            actionChose(countries, lhs, rhs);
        } else {
            d3.select("#lastAction").text("something else happened");
	}
	d3.select("#asdf").text(lastAction); 
    }

    var actionAttacked = function (countries, lhs, rhs) {
        var attackingCountry = lhs.slice(11, -3);
        var defendingCountry = rhs.slice(12, rhs.indexOf(">")-1);
        var attacker = countries[attackingCountry]["owner"];
        var defender = countries[defendingCountry]["owner"];
        var unparsedResults = rhs.slice(rhs.indexOf(">"));
        var lost = unparsedResults.indexOf("lost");
        var troopText;
        if (unparsedResults.charAt(lost + 5) != 0) {
            var loser = unparsedResults.slice(14, lost-3);
            var troops = unparsedResults.charAt(lost+5);
            troopText = loser + " lost " + troops + " troops"; 
	}
        unparsedResults = unparsedResults.slice(lost+5);
        lost = unparsedResults.indexOf("lost");
        if (unparsedResults.charAt(lost + 5) != 0) {
            var loser = unparsedResults.slice(14, lost-3);
            var troops = unparsedResults.charAt(lost+5);
	    troopText = troopText + "; " + loser + " lost " + troops + " troops.";
	}
        d3.select("#lastAction").text(attacker + " / " + attackingCountry + " attacked " + defender + " / " +  defendingCountry);
        d3.select("#lastActionResults").text(troopText);
        attackAnimation(attackingCountry, defendingCountry);
    };

    var attackAnimation = function (attacker, defender) {
        d3.select("#" + attacker.split(" ").join("") + " .countryCircle")
            .style("stroke", "red")
        .transition()
            .style("stroke", "black")
            .duration(1000);

        d3.selectAll(".link").each(function(d) {
            if ((d.source.name == attacker && d.target.name == defender) || (d.source.name == defender && d.   target.name == attacker)) {
                d3.select(this)
                    .style("stroke", "red")
                    .style("stroke-width", 5)
                .transition()
                    .style("stroke", "black")
                    .style("stroke-width", 3)
                    .duration(1000);
            }
        });
    };

var actionReinforced = function (currentTurn, lhs, rhs) {
        var from = lhs.slice(11, -3);
        var to = rhs.slice(12, rhs.indexOf(">")-1);
        var results = rhs.slice(rhs.indexOf(">") + 1);
        d3.select("#lastAction").text(from + " reinforced " + to + results);
        d3.select("#lastActionResults").text("");
        reinforceAnimation(from, to);
    };

    var reinforceAnimation = function (from, to) {
        d3.selectAll(".link").each(function(d) {
            if ((d.source.name == from && d.target.name == to) || (d.source.name == to && d.target.name ==     from)) {
                d3.select(this)
                    .style("stroke", "blue")
                    .style("stroke-width", 5)
                .transition()
                    .style("stroke", "black")
                    .style("stroke-width", 3)
                    .duration(1000);
            }
        });
    };

    var actionDeployed = function (currentTurn, lhs, rhs) {
        var player = lhs;
        var countries = rhs.slice(1,-1).split(",");
        var deployedTo = "";
        for (i in countries) {
            var data = countries[i].split(":");
            var country_name = data[0].slice(3, -1);
            var troops = data[1];
            deployedTo = deployedTo + troops + " troops to " + country_name + "</br>";
            deployAnimation(country_name);
        }
        d3.select("#lastAction").html(player + " deployed: </br> " + deployedTo);
        d3.select("#lastActionResults").text("");
    };

    var deployAnimation = function (country) {
        d3.select("#" + country.split(" ").join("") + " .countryCircle").each(function(d) {
            var cStroke = d3.select(this).style("stroke");
            d3.select(this)
                .style("stroke", "white")
            .transition()
                .style("stroke", "black")
                .duration(1000);
        });
    };
    var actionDefeated = function (currentTurn, lhs, rhs) {
        var attacker = lhs.slice(11, -3);
        var loser = rhs.slice(12, -2);
        var results = "";
        d3.select("#lastAction").text(attacker + " defeated " + loser);
        d3.select("#lastActionResults").text(results);
	attackAnimation(attacker, loser);
    };

    var actionSpent = function (currentTurn, lhs, rhs) {
        var player = lhs;
        var cards = rhs;
        var results = "results";
        d3.select("#lastAction").text(player + " spent " + cards);
        d3.select("#lastActionResults").text("");
    };

    var actionChose = function (currentTurn, lhs, rhs) {
        var player = lhs.slice(9, -3);
        var country = rhs.slice(20, -2);
        d3.select("#lastAction").text(player + " chose " + country);
        d3.select("#lastActionResults").text("");
        deployAnimation(country);
    };

    var updateNodes = function(currentTurn) {
        var countries = currentTurn["countries"];
        var data = [];
        var currentData = d3.selectAll(".node").data();
        for (i in currentData) {
            d=currentData[i]; 
            d.owner = countries[d.name]["owner"]; 
            d.troops = countries[d.name]["troops"];
            //d.fixed=false; 
            data.push(d); 
        }
        d3.selectAll(".node").data(data, function(d) {return d.name;});
        d3.selectAll(".node").select(".countryCircle").style("fill", function(d) {return colors[playerList[d.owner]]}); 
        force.start(); 
    };

    var autoSlide = function(slideTo, factor) {
        factor = factor || 1; 
        slideTo = slideTo || $("#slider").slider("value") + factor; 
        if (slideTo == broadcasts) {
            pause($("#pause").data("intervalID")); 
	}
	$("#slider").slider("value", slideTo);  
        $.getJSON("/game/" + gameID + "/"+ slideTo, function(data) {
            if (data["turn"] == 0) { 
                $("#turn").text("Turn: " + data["turn"] + " - Initial Deployment");
            } else {
                $("#turn").text("Turn: " + data["turn"]);
            }
            updateNodes(data);
            updateStats(data);
        });
    };

    var play = function(speed, factor) {
        var intervalId = window.setInterval(function() {
		autoSlide(null, factor); }, speed); 
        return intervalId; 
    };

    var pause = function(intervalId) {
        window.clearInterval(intervalId); 
    };

//})(this); 
