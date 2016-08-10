/**
 * Created by eamonnmaguire on 08/07/2016.
 */

var citation_summary = (function () {

    var self_cite_colors = d3.scale.ordinal().domain(["self", "not self"]).range(["#e74c3c", "#3498db"]);
    var subject_area_colors = d3.scale.ordinal().range(["#95a5a6", "#7f8c8d", "#34495e", "#8e44ad"]);
    var citation_type_colors = d3.scale.ordinal().domain(["preprint", "article"]).range(["#3498db", "#2980b9"])
    var date_format = "%d %b %Y";

    var formatNumber = d3.format(",d"),
        formatDate = d3.time.format(date_format),
        formatTime = d3.time.format("%I:%M %p"),
        normalised_number_format = d3.format("s");

    var parseDate = function (d) {
        return new Date(d.substring(0, 4),
            d.substring(5, 7),
            d.substring(8));
    };

    var calculate_window_width = function () {
        return $(window).width();
    };

    var calculate_vis_width = function (window_width, normal_width_ratio) {
        if (window_width <= 900) {
            return window_width * .63;
        } else {
            return window_width * normal_width_ratio;
        }
    };


    var process_data = function (data) {
        data.forEach(function (d, i) {
            d.index = i;
            d.cited_paper_date = parseDate(d.cited_paper_date);
            d.citation_date = parseDate(d.citation_date);
        });
    };

    return {
        render: function (url, options) {
            d3.json(url, function (result) {

                var citation_data = result.citations;

                process_data(citation_data);

                var observed_papers = [];

                var papers = crossfilter(citation_data),
                    papers_by_date = papers.dimension(function (d) {
                        return d.cited_paper_date;
                    }),

                    citations_by_date = papers.dimension(function (d) {
                        return d.citation_date;
                    }),

                    citation_type = papers.dimension(function (d) {
                        return d.citation_type;
                    }),

                    self_citation = papers.dimension(function (d) {
                        return d.self_citation ? "self" : "not self";
                    }),

                    subject_area = papers.dimension(function (d) {
                        return d.citation_subject;
                    }),


                    citation_count_group = citations_by_date.group().reduce(function (p, v) {
                        return p + 1;
                    }, function (p, v) {
                        return p - 1
                    }, function () {
                        return 0
                    }),

                    papers_count_group = papers_by_date.group().reduce(function (p, v) {
                        if(observed_papers.indexOf(v.cited_paper_id) == -1) {
                            observed_papers.push(v.cited_paper_id);
                            return p + 1;
                        }
                    }, function (p, v) {
                        if(observed_papers.indexOf(v.cited_paper_id) !== -1) {
                            delete observed_papers[v.cited_paper_id]
                            return p - 1
                        }
                    }, function () {
                        return 0
                    }),

                    citation_type_count = citation_type.group().reduce(function (p, v) {
                        return p + 1;
                    }, function (p, v) {
                        return p - 1
                    }, function () {
                        return 0
                    }),

                    self_type_count = self_citation.group().reduce(function (p, v) {
                        return p + 1;
                    }, function (p, v) {
                        return p - 1
                    }, function () {
                        return 0
                    }),


                    subject_area_count = subject_area.group().reduce(function (p, v) {
                        return p + 1;
                    }, function (p, v) {
                        return p - 1
                    }, function () {
                        return 0
                    });

                var top_value = 0;
                var cumulative_citation_group = {
                    all: function () {
                        var cumulate = 0;
                        var g = [];
                        citation_count_group.all().forEach(function (d, i) {
                            cumulate += d.value;
                            top_value = cumulate;
                            g.push({
                                key: d.key,
                                value: cumulate,
                                single_value: d.value
                            })
                        });
                        return g;
                    }
                };

                var minCitationDate = new Date(citations_by_date.bottom(1)[0].citation_date);
                var maxCitationDate = new Date(citations_by_date.top(1)[0].citation_date);

                var minPaperDate = new Date(papers_by_date.bottom(1)[0].cited_paper_date);
                var maxPaperDate = new Date(papers_by_date.top(1)[0].cited_paper_date);

                var minDate = minCitationDate < minPaperDate ? minCitationDate : minPaperDate;
                var maxDate = maxCitationDate > maxPaperDate ? maxCitationDate : maxPaperDate;
                minDate.setDate(minDate.getDate() - 30);
                maxDate.setDate(maxDate.getDate() + 30);

                var window_width = calculate_window_width();
                var rptLine = dc.compositeChart(document.getElementById("citations"));

                rptLine
                    .width(calculate_vis_width(window_width, 0.85))
                    .height(300)
                    .margins({top: 10, right: 50, bottom: 30, left: 60})
                    .x(d3.time.scale().domain([minDate, maxDate]))
                    .xUnits(d3.time.months)
                    .renderHorizontalGridLines(true)
                    .dimension(citations_by_date)
                    .renderVerticalGridLines(true)
                    .compose([
                        dc.lineChart(rptLine)

                            .group(cumulative_citation_group, 'Cumulative Citations')
                            .valueAccessor(function (d) {
                                return d.value;
                            })
                            .colors('#3498db'),

                        dc.barChart(rptLine)

                            .group(cumulative_citation_group, 'Citations')
                            .valueAccessor(function (d) {
                                return d.single_value;
                            })
                            .colors('#3498db'),

                        dc.barChart(rptLine)
                            .group(papers_count_group, 'Papers')
                            .colors('#2c3e50')

                    ]);

                rptLine.legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
                    .brushOn(true);

                dc.pieChart("#citation_subjects")
                    .dimension(citation_type)
                    .group(citation_type_count)
                    .colors(citation_type_colors);

                dc.pieChart("#self_cites")
                    .dimension(self_citation)
                    .group(self_type_count)
                    .colors(self_cite_colors);

                dc.pieChart("#subject_area")
                    .dimension(subject_area)
                    .group(subject_area_count)
                    .colors(subject_area_colors);



                dc.renderAll();
            });
        }
    }
})();