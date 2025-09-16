/**
 * WindowsBuilds Build Summaries JavaScript
 * Handles secure AJAX requests for build summaries with CSRF protection
 */

!function($, window, document, _undefined) {
    "use strict";

    XF.WindowsBuildSummary = XF.Element.newHandler({
        options: {
            endpoint: null,
            uuid: null,
            title: null,
            buildNumber: null,
            channel: null,
            version: null,
            platform: null,
            latest: false
        },

        init: function() {
            this.$target.on('click', $.proxy(this, 'loadSummary'));
        },

        loadSummary: function(e) {
            e.preventDefault();
            
            var self = this;
            var $tooltip = this.$target.find('.tooltip-content');
            
            if ($tooltip.data('loaded')) {
                return;
            }

            $tooltip.html('<span class="loading">Loading summary...</span>');
            
            var data = {
                _xfToken: XF.config.csrf,
                _xfRequestUri: window.location.pathname,
                _xfWithData: 1,
                _xfResponseType: 'json'
            };

            // Add relevant parameters based on endpoint
            if (this.options.uuid) {
                data.uuid = this.options.uuid;
            }
            if (this.options.title) {
                data.title = this.options.title;
            }
            if (this.options.buildNumber) {
                data.build_number = this.options.buildNumber;
            }
            if (this.options.channel) {
                data.channel = this.options.channel;
            }
            if (this.options.version) {
                data.version = this.options.version;
            }
            if (this.options.platform) {
                data.platform = this.options.platform;
            }
            if (this.options.latest) {
                data.latest = this.options.latest;
            }

            XF.ajax('GET', this.options.endpoint, data, function(response) {
                if (response.summary) {
                    $tooltip.html(response.summary);
                    $tooltip.data('loaded', true);
                } else {
                    $tooltip.html('<span class="error">Failed to load summary</span>');
                }
            }, {
                error: function(xhr, status, error) {
                    console.error('Failed to load build summary:', error);
                    $tooltip.html('<span class="error">Error loading summary</span>');
                }
            });
        }
    });

    /**
     * Batch load summaries for multiple builds
     */
    XF.WindowsBuildBatchSummary = XF.Element.newHandler({
        options: {
            type: 'windows',
            selector: '.build-item'
        },

        init: function() {
            this.$target.on('click', $.proxy(this, 'loadBatchSummaries'));
        },

        loadBatchSummaries: function(e) {
            e.preventDefault();
            
            var self = this;
            var $items = this.$target.find(this.options.selector);
            var uuids = [];

            $items.each(function() {
                var uuid = $(this).data('uuid');
                if (uuid && !$(this).data('loaded')) {
                    uuids.push(uuid);
                }
            });

            if (uuids.length === 0) {
                return;
            }

            // Batch load up to 50 at a time
            var chunks = [];
            for (var i = 0; i < uuids.length; i += 50) {
                chunks.push(uuids.slice(i, i + 50));
            }

            chunks.forEach(function(chunk) {
                self.loadChunk(chunk);
            });
        },

        loadChunk: function(uuids) {
            var self = this;
            
            XF.ajax('POST', '/builds/summary/batch', {
                _xfToken: XF.config.csrf,
                _xfRequestUri: window.location.pathname,
                _xfWithData: 1,
                _xfResponseType: 'json',
                uuids: uuids,
                type: this.options.type
            }, function(response) {
                if (response.summaries) {
                    for (var uuid in response.summaries) {
                        var $item = self.$target.find('[data-uuid="' + uuid + '"]');
                        var $tooltip = $item.find('.tooltip-content');
                        $tooltip.html(response.summaries[uuid]);
                        $item.data('loaded', true);
                    }
                }
            }, {
                error: function(xhr, status, error) {
                    console.error('Failed to load batch summaries:', error);
                }
            });
        }
    });

    /**
     * Helper function to get build summary URL
     */
    XF.WindowsBuilds = {
        getSummaryUrl: function(type, params) {
            var baseUrl = '/builds/summary/';
            
            switch(type) {
                case 'windows':
                    return baseUrl + 'windows';
                case 'edge':
                    return baseUrl + 'edge';
                case 'office':
                    return baseUrl + 'office';
                default:
                    return null;
            }
        },

        /**
         * Load a single summary
         */
        loadSummary: function(type, params, callback) {
            var url = this.getSummaryUrl(type);
            if (!url) {
                console.error('Invalid summary type:', type);
                return;
            }

            var data = $.extend({
                _xfToken: XF.config.csrf,
                _xfRequestUri: window.location.pathname,
                _xfWithData: 1,
                _xfResponseType: 'json'
            }, params);

            XF.ajax('GET', url, data, function(response) {
                if (callback && response.summary) {
                    callback(response.summary);
                }
            }, {
                error: function(xhr, status, error) {
                    console.error('Failed to load summary:', error);
                    if (callback) {
                        callback('Error loading summary');
                    }
                }
            });
        }
    };

    // Register handlers
    XF.Element.register('windows-build-summary', 'XF.WindowsBuildSummary');
    XF.Element.register('windows-build-batch-summary', 'XF.WindowsBuildBatchSummary');

}(jQuery, window, document);