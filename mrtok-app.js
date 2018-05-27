/**
 * MRTOK - MRTOK displays Singapore MRT trains' real-time statuses from official sources and social media
 *
 * @author   Samuel Liew <samliew@gmail.com>
 * @license  MIT license
 * @version  1.2
 * @link     https://github.com/samliew/mrtok
 */

/* global Image, location, jQuery, $, moment, navigator */

// Check jQuery dependancy
if(typeof jQuery === 'undefined') console.error('MRTOK.Main - jQuery not found');

// Singleton app
var MRTOK = MRTOK || {
    
    initialised: false,
    environment: 'development',
    ajaxErrors: 0,
    rResults: {},
    tResults: {},
    rResultsDev: {},
    tResultsDev: {},
    
    settings: {
        dateFormat: 'dddd, Do MMM YYYY h:mm a',
        timeFormat: 'h:mma',
        nHrsAgo: moment().subtract(6, 'hours'),
        officialHrsAgo: moment().subtract(6, 'hours'),
    },
    
    news: {
        isEnabled: false,
        enabledUntil: moment.tz('2017-07-19 00:00', 'Asia/Singapore'),
        isDelayed: false, // master delay override
        bodyText: '',
        linkText: '', // null or empty for default text
        linkUrl: '', // null or empty to hide button
        bgcolor: null, // null or empty for default gray
        /* 
            Possible background colours suitable with white text
            #1976d2 - blue
            #d32f2f - red
            #2e7d32 - green
            #4e342e - brown
            #000000 - black
            null    - gray
        */
    },
    
    // For use when official Tweets span full/multiple days
    pinnedTweetIds: [],
    
    // Ban a single Reddit post
    bannedRedditPostIds: [],
    
    // Ban a single Twitter post
    bannedTwitterPostIds: [],
    
    // Banned Twitter accounts mostly due to tweets not being real-time, or don't provide useful information
    bannedTwitters: [
        // News sites
        'STcomSingapore','STcom','ChannelNewsAsia','YahooSG','TODAYonline',
        'Power98News',
        // Bots
        'sgtastemakers','SG_Alerts','KopitiamBot','SG_CommComm','SGnews',
        'SingaporeNewsSG','sgpressrelease','CoconutsSG','sgpElections',
        'singaporeinform','majulahreport','BusInsiderSG',
        // Re-posters or ranters
        'websterlkc','contrabandkarma','xlcliangx','sg_beaglekk',
    ],
    
    // Reasons why a post would fail validation
    errorReasons: {
        bannedGeneral: 'Account banned for not providing real-time unique reports',
        bannedReshare: 'Account banned for resharing without adding value',
        bannedRant: 'Account banned for ranting and not actually reporting incidents',
        bannedDomain: 'Invalid due to resharing external link',
        noTags: 'Unable to detect which line or specific station in the post',
        noKeywords: 'Unable to determine whether post is a true positive due to lack of keywords',
        invalidKeywords: 'Post is most likely a false positive due to certain keywords present',
    },
    
    lineStationsMap: {
        'NSL':['Jurong East','Bukit Batok','Bukit Gombak','Choa Chu Kang','CCK','Yew Tee','Kranji','Marsiling','Woodlands','Admiralty','Sembawang','Canberra','Yishun','Khatib','Yio Chu Kang','YCK','Ang Mo Kio','AMK','Bishan','Braddell','Toa Payoh','Novena','Newton','Orchard','Somerset','Dhoby Ghaut','City Hall','Raffles Place','Marina Bay','Marina South Pier'], // NSL
        'EWL':['Expo','Changi Airport','Pasir Ris','Tampines','Simei','Tanah Merah','Bedok','Kembangan','Eunos','Paya Lebar','Aljunied','Kallang','Lavender','Bugis','City Hall','Raffles Place','Tanjong Pagar','Outram Park','Tiong Bahru','Redhill','Queenstown','Commonwealth','Buona Vista','Dover','Clementi','Jurong East','Chinese Garden','Lakeside','Boon Lay','Pioneer','Joo Koon','Gul Circle','Tuas Crescent','Tuas West Road','Tuas Link'], // EWL
        'CCL':['Dhoby Ghaut','Bras Basah','Esplanade','Promenade','Nicoll Highway','Stadium','Mountbatten','Dakota','Paya Lebar','MacPherson','Tai Seng','Bartley','Serangoon','Lorong Chuan','Bishan','Marymount','Caldecott','Bukit Brown','Botanic Gardens','Farrer Road','Holland Village','Buona Vista','one-north','Kent Ridge','Haw Par Villa','Pasir Panjang','Labrador Park','Telok Blangah','HarbourFront','Keppel','Cantonment','Prince Edward'], // CCL
        'NEL':['HarbourFront','Outram Park','Chinatown','Clarke Quay','Dhoby Ghaut','Little India','Farrer Park','Boon Keng','Potong Pasir','Woodleigh','Serangoon','Kovan','Hougang','Buangkok','Sengkang','Punggol','Punggol Coast'], // NEL
        'DTL':['Bukit Panjang','Cashew','Hillview','Beauty World','King Albert Park','Sixth Avenue','Tan Kah Kee','Botanic Gardens','Stevens','Newton','Little India','Rochor','Bugis','Promenade','Bayfront','Downtown','Telok Ayer','Chinatown','Fort Canning','Bencoolen','Jalan Besar','Bendemeer','Geylang Bahru','Mattar','MacPherson','Ubi','Kaki Bukit','Bedok North','Bedok Reservoir','Tampines West','Tampines','Tampines East','Upper Changi','Expo','Xilin','Sungei Bedok'], // DTL
        //'TEL':['Woodlands North','Woodlands','Woodlands South','Springleaf','Lentor','Mayflower','Bright Hill','Upper Thomson','Caldecott','Mount Pleasant','Stevens','Napier','Orchard Boulevard','Orchard','Great World','Havelock','Outram Park','Maxwell','Shenton Way','Marina Bay','Marina South','Gardens by the Bay','Tanjong Rhu','Katong Park','Tanjong Katong','Marine Parade','Marine Terrace','Siglap','Bayshore','Bedok South','Sungei Bedok'], // TEL
        'BPLRT':['Choa Chu Kang','South View','Keat Hong','Teck Whye','Phoenix','Bukit Panjang','Petir','Pending','Bangkit','Fajar','Segar','Jelapang','Senja','Ten Mile Junction'], // BPLRT
        'SKLRT':['Sengkang','Compassvale','Rumbia','Bakau','Kangkar','Ranggung','Cheng Lim','Farmway','Kupang','Thanggam','Fernvale','Layar','Tongkang','Renjong'], // SKLRT
        'PGLRT':['Punggol','Cove','Meridian','Coral Edge','Riviera','Kadaloor','Oasis','Damai','Sam Kee','Teck Lee','Punggol Point','Samudera','Nibong','Sumang','Soo Teck'], // PGLRT
    },
    
    
    states: {
        
        yes: {
            name: 'yes',
            displaytext: '<span class="green">Yes, it\'s business as usual.</span>',
            color: '#009900',
            icon: 'https://daks2k3a4ib2z.cloudfront.net/596eaa3da18e1f1ba60f3d19/59acda872231fd0001f41823_mrtok.png',
            taglines: [
                'That\'s good news!',
                'Stay tuned for updates',
                'This page refreshes automatically',
                'This site only displays posts from the past few hours',
                '<a href="https://mrtok.com/report-train-delay">Report train delay/breakdown</a>',
                'Help your fellow commuters by <a href="https://mrtok.com/report-train-delay">reporting train delays</a>',
                'Check out the <a href="https://mrtok.com/faq">FAQ</a> to learn more about MRTOK!',
            ],
        },
        no: {
            name: 'no',
            displaytext: '<span class="red">NO! The MRT seems to be delayed.</span>',
            color: '#DD0000',
            icon: 'https://daks2k3a4ib2z.cloudfront.net/596eaa3da18e1f1ba60f3d19/59acda871c303d0001fd9a74_mrtnotok.png',
            taglines: [
                'No surprises here ಠ_ಠ',
                'Walao eh, not again!!! (╯°□°）╯︵ ┻┻',
                'Please plan your trip early',
                'That\'s business as usual...',
                '"We\'re working on it."',
                'Oops! "Bad Luck" again.',
            ],
        },
        maybe: {
            name: 'maybe',
            displaytext: '<span class="orange">Unable to determine. Please try again later.</span>',
            color: null,
            icon: null,
            taglines: [
                'Could not retrieve data from one or more sources. You might have poor internet connection or a social media source returned a server error.',
            ],
        }
    },
    
    
    validators: {
        
        isBannedReddit: function(param) {
            return MRTOK.bannedRedditPostIds.indexOf(typeof param === 'string' ? param : param.id) >= 0;
        },
        
        isBannedTwitter: function(param) {
            return MRTOK.bannedTwitterPostIds.indexOf(typeof param === 'string' ? param : param.id_str) >= 0;
        },
        
        isOfficialTwitter: function(param) {
            return ['SMRT_Singapore','SBSTransit_Ltd']
                .indexOf(typeof param === 'string' ? param : param.user.screen_name) >= 0;
        },
        
        isPermaTweet: function(param) {
            return MRTOK.pinnedTweetIds.indexOf(typeof param === 'string' ? param : param.id_str) >= 0;
        },
        
        isBannedTwitterUser: function(param) {
            return MRTOK.bannedTwitters.indexOf(typeof param === 'string' ? param : param.user.screen_name) >= 0;
        },
        
        hasBannedKeywords: function(str) {
            // Special characters must be escaped with \\
            var bannedKeywords = [
                'po\\.st','goo\\.gl','bit\\.ly',
                'eve\\b','holiday','any update','is the','thanks? for',
                'causes','I\'m at','posted from','yahoo','ChannelNewsAsia',
                'any (train )?delay','delay(ed)?\\?$','yesterday','ytd',
                'i hope','hopefully','heng','hope no','diverted','back to normal',
                'skip \\w+ bus stop','operating as usual','expect delays',
                '(this|next) (sun|mon|tue|wed|thurs|fri|sat|week)',
                'some[a-zA-Z\\s]+expect','trading','stock','poll','opinion',
                'article','lost','found','do you think', 'should',
                //'cleared','resumed',
            ];
            return str.match(new RegExp('(' + bannedKeywords.join('|') + ')', 'i')) !== null;
        }
    },
    
    
    helpers: {
        
        mapToLines: function(str) {
            str = str.toLowerCase();
            var tags = [];
            // Match without removing duplicates
            Object.keys(MRTOK.lineStationsMap).forEach(function(lineCode) {
                var stations = MRTOK.lineStationsMap[lineCode];
                for (var station of stations) {
                    if (str.indexOf(station.toLowerCase()) > -1) {
                        tags.push(lineCode.toLowerCase());
                    }
                }
            });
            
            // Try to figure out line based on colour mentioned
            if(str.match(/\bred\b/gi)) tags.push('nsl');
            if(str.match(/\bgreen\b/gi)) tags.push('ewl');
            if(str.match(/\bblue\b/gi)) tags.push('dtl');
            if(str.match(/\byellow\b/gi)) tags.push('ccl');
            if(str.match(/\bpurple\b/gi)) tags.push('nel');
            if(str.match(/\bbrown\b/gi)) tags.push('tel');
            
            // Duplicates? Most likely the stations affected are on the same line
            // https://stackoverflow.com/a/35922651/584192
            var sorted_arr = tags.slice().sort();
            var dupes = sorted_arr.reduce(function(acc, el, i, arr) {
              if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc;
            }, []);
            
            // Return duplicate lines if any
            if(dupes.length > 0) return dupes;
            
            // Otherwise, get unique tags
            // https://stackoverflow.com/a/14438954/584192
            tags = tags.filter(function(value, index, self) {
                return self.indexOf(value) === index;
            });
            
            // Return detected lines
            return tags.length ? tags : null;
        },
        
        matchTags: function(str) {
            str = str.toLowerCase();
            var tags = [];
            if(str.match(/\bns(ew)?l?(ine)?\b/) || str.match(/north[-\s]?south/)) tags.push('nsl');
            if(str.match(/\b(ns)?ewl?(ine)?\b/) || str.match(/east[-\s]?west/)) tags.push('ewl');
            if(str.match(/\bnel(ine)?\b/) || str.match(/north[-\s]?east/)) tags.push('nel');
            if(str.match(/\bccl(ine)?\b/) || str.match(/circle[-\s]?line/)) tags.push('ccl');
            if(str.match(/\bdtl(ine)?\b/) || str.match(/downtown[-\s]?line/)) tags.push('dtl');
            //if(str.match(/\btel(ine)?\b/) || str.match(/thomson[-\s]?line/)) tags.push('tel');
            //if(str.match(/\bjrl(ine)?\b/) || str.match(/jurong[-\s]?region/)) tags.push('jrl');
            //if(str.match(/\bcrl(ine)?\b/) || str.match(/cross[-\s]?island/)) tags.push('crl');
            
            if(str.match(/\bbplrt\b/) || (str.match(/lrt/) && str.match(/bukit\s?panjang/))) tags.push('bplrt');
            if(str.match(/\bsklrt\b/) || (str.match(/lrt/) && str.match(/seng\s?kang/))) tags.push('sklrt');
            if(str.match(/\bpglrt\b/) || (str.match(/lrt/) && str.match(/punggol/))) tags.push('pglrt');
            if(tags.length === 0 && str.match(/lrt/)) tags.push('lrt');
            
            return tags.length ? tags : null;
        },
        
        noShouting: function(str) {
            // Strip htmlentities and non-alpha chars
            var temp = str.replace(/&[a-z]+;/gi, '').replace(/[^a-z]+/gi, '');
            
            // Match uppercase characters
            var charUC = temp.match(/[A-Z]/g);
            
            // If 50% or more are capitalized, convert entire string to lowercase
            if(charUC && charUC.length > temp.length * 0.5) {
                str = str.toLowerCase();
            }
            return str;
        },
        
        capitalizeLinesAndStations: function(str) {
            // Expand station names from common abbrs
            str = str
                .replace(/\bns(l|\s?line)?\b/gi, 'NSL')
                .replace(/\bew(l|\s?line)?\b/gi, 'EWL')
                .replace(/#?AMK\b/gi, 'Ang Mo Kio')
                .replace(/#?YCK\b/gi, 'Yio Chu Kang')
                .replace(/#?CCK\b/gi, 'Choa Chu Kang')
                .replace(/#?TPY\b/gi, 'Toa Payoh')
                .replace(/#?LTI\b/gi, 'Little India')
                .replace(/#?OTP\b/gi, 'Outram Park')
                .replace(/#?PTP\b/gi, 'Potong Pasir')
                .replace(/#?JE\b/gi, 'Jurong East')
                .replace(/\bOutram( Park)?\s/gi, 'Outram Park ')
                .replace(/\bbk?t\.?\sp/gi, 'Bukit P')
                .replace(/\bpjg/gi, 'Panjang')
                .replace(/\bbk?t\.?\sb/gi, 'Bukit B');
            
            Object.keys(MRTOK.lineStationsMap).forEach(function(lineCode) {
                // Capitalize line code
                str = str.replace(new RegExp('\\b' + lineCode + '\\b', 'gi'), lineCode.toUpperCase());
                
                // Capitalize station names, and wrap with station tag
                var stations = MRTOK.lineStationsMap[lineCode];
                for (var station of stations) {
                    var regstr = station.replace(/\s/g, '\\\s?');
                    str = str.replace(new RegExp('(?<!\>)#?' + regstr + '\\b', 'gi'), '<span data-station>'+station+'</span> ');
                }
            });
            
            // Remove duplicate stations
            str = $('<span>').html(str);
            str.find('span[data-station]').filter(function() {
                return this.nextSibling.nodeValue === ' ' && this.nextSibling.nextSibling && this.innerText === this.nextSibling.nextSibling.innerText;
            }).remove();
            str = str.html();
            
            return str;
        },
        
        humanizeText: function(str) {
            return str
                .replace(/\b(B|b)e?twn\b/gi, '$1etween')
                .replace(/in between/gi, 'in-between')
                .replace(/\b(A|a)vail\b/gi, '$1vailable')
                .replace(/\b(A|a)dd'?l\b/gi, '$1dditional')
                .replace(/\b(P|p)ls\b/gi, '$1lease')
                .replace(/\b(S|s)vc/gi, '$1ervice')
                .replace(/\b(S|s)tn/gi, '$1tation')
                .replace(/\bprob\b/g, 'problem')
                .replace(/\btwds\b/g, 'towards')
                .replace(/\bi(m|ll)\b/gi, 'I\'$1')
                .replace(/\bi('(m|ll))?\b/gi, 'I$1')
                .replace(/\babt\b/gi, 'about')
                .replace(/\bytd\b/gi, 'yesterday')
                .replace(/\btmr\b/gi, 'tomorrow')
                .replace(/\bpk\b/gi, 'Park')
                .replace(/\bu\b/gi, 'you')
                .replace(/\br\b/gi, 'are')
                .replace(/\bn\b/gi, 'and')
                .replace(/\ba(bit|lot)\b/gi, 'a $1')
                .replace(/\bmth\b/gi, 'month')
                .replace(/\byr\b/gi, 'your')
                .replace(/\bbth\b/gi, 'both')
                .replace(/\s@\s/g, ' at ');
        },
        
        sanitizeText: function(str) {
            var UC = function(v) { return v.toUpperCase(); };
            
            str = MRTOK.helpers.noShouting(str);
            str = MRTOK.helpers.capitalizeLinesAndStations(str);
            str = MRTOK.helpers.humanizeText(str);
            return str
                .replace(/@[^\s]+\s*/g, '') // @ mentions
                .replace(/#(\w*[0-9a-zA-Z]+\w*[0-9a-zA-Z])\s?/g, '') // # tags
                .replace(/[”"]/g, '') // remove quotes
                .replace(/As (reported|posted|seen) on (FB|facebook)[.,\s]+/i, '')
                .replace(/\s+we are sorry.?$/i, '')
                .replace(/\b(?:https?|ftp):\/\/[\n\S]+\b/gi, '') // urls
                .replace(/\b(shit|fu?c?k(ed|ing)?|cc?b|chee\sb(ye|ai)|lj|smlj|nabei|nb|wtf)/gi, '****') // profanities
                .replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2694-\u2697]|\uD83E[\uDD10-\uDD5D])/g, '') // emojis
                .replace(/^\s*[0-9]{1,2}(:|\.|\/)[0-9]{2}(,|\s)*\b/i, '') // date in the front
                .replace(/^\s*[0-9]{1,2}(:|\.)[0-9]{2}[apm]+(\:|\s)*\b/i, '') // time in the front
                .replace(/^\s*(\[|\()[a-z.\s_-]+(\]|\))(\:|\s)*/i, '') // tags in the front
                .replace(/^\s*(PSA|UPDATE)(\:|\s)*\b/i, '') // keywords in the front
                .replace(/\s+#\s+/g, ' ') // remove orphaned hash symbols
                .replace(/\s*#/g, ' #') // spaces before hashtags
                .replace(/\s+/g, ' ') // multiple spaces
                .replace(/\s?[!?.]+\s?/g, '. ').replace(/[.]\s[.]/g, '. ') // excessive punctuation
                .replace(/^[“”"':.,\s]+/, '') // trim spaces and punctuation at the front
                .replace(/[“”"':.,\s]+$/, '') // trim spaces and punctuation at the end
                .replace(/\b(\d+)\.\s(\d+)/, '$1:$2') // incorrect period usage for time
                .replace(/\bs?mrt/gi, UC) // SMRT
                .replace(/\blrt\b/gi, UC) // LRT
                .replace(/(\d+)\s?min?(s)?\b/gi, '$1 min$2') // space between num and mins
                .replace(/(^.|\.\s*.)/g, UC); // Sentence case
        },
        
        changeMobileThemeColor: function(color) {
            document.querySelector("meta[name=theme-color]").setAttribute("content", color);
            document.querySelector("meta[name=msapplication-navbutton-color]").setAttribute("content", color);
            document.querySelector("meta[name=apple-mobile-web-app-status-bar-style]").setAttribute("content", color);
        },
        
        // Append to URL parameters for cache-breaking purposes
        currTime: function(prefix) {
            if(typeof prefix === undefined) prefix = '?';
            return prefix + 'time=' + Math.floor(new Date().getTime() / 30000);
        },
        
        // Decode HTML entities. See https://stackoverflow.com/a/23270912/584192
        htmlentities: function(str) {
			var buf = [];
			for(var i=str.length-1; i>=0; i--) {
				buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
			}
			return buf.join('');
		},
		
		// Function to temporary inject custom CSS
		injectCss: function() {
		    $('<style type="text/css">').html("\
                [data-station] {\
                    font-weight: 600;\
                    color: #e00;\
                }")
                .appendTo("head");
		},
    },
    
    
    services: {
        
        reddit: function() {
            var rUrl = 'https://www.reddit.com/r/singapore/search.json?q=';
            var rOpts = '&restrict_sr=on&sort=relevance&t=day';
            if(MRTOK.environment == 'testing') {
                rOpts = '&restrict_sr=on&sort=new&limit=1000&t=year';
            }
            
            var rTerms = [
              'fault',
              'delay',
              'breakdown',
            ];
            rTerms.forEach(function(term) {
                $.getJSON(rUrl + term + rOpts + MRTOK.helpers.currTime('&'), function(data) {
                    $.each(data.data.children, function(k, v) {
                        var postErrors = [];
                        var post = v.data;
                        var postTitle = post.title.toLowerCase();
                        var postDate = moment.tz(post.created_utc*1000, 'UTC');
                        if(post.downs >= 10 || // ignore poor ones
                           !postDate.isAfter(MRTOK.settings.nHrsAgo) // ignore outdated ones
                        ) {
                            return false;
                        }
                        if(MRTOK.validators.isBannedReddit(post)) {
                            postErrors.push('[REDDIT] ' + MRTOK.errorReasons.bannedGeneral, post.id, post);
                        }
                        if(post.domain !== 'self.singapore' &&
                           post.domain !== 'i.redd.it'
                        ) {
                            postErrors.push('[REDDIT] ' + MRTOK.errorReasons.bannedDomain, post.domain, post);
                        }
                        if(postTitle.match(/(train|mrt|power|track|fault|delay|signal|breakdown)/) === null || // require any keywords
                           postTitle.match(/(who|what|where|when|why|might|is there)\b/) !== null // no questions
                        ) {
                            postErrors.push('[REDDIT] ' + MRTOK.errorReasons.noKeywords, post);
                        }
                        var text = post.title + ' ' + post.selftext;
                        if(MRTOK.validators.hasBannedKeywords(text)) {
                            postErrors.push('[REDDIT] ' + MRTOK.errorReasons.invalidKeywords, post);
                        }
                        var postTags = MRTOK.helpers.matchTags(text) || MRTOK.helpers.mapToLines(text);
                        if(!postTags || postTags.length > 2) { // no lines or too many
                            postErrors.push('[REDDIT] ' + MRTOK.errorReasons.noTags, post);
                        }
                        
                        var postObj = {
                            title: post.title,
                            selftext: post.selftext,
                            selftext_html: post.selftext_html,
                            created_utc: post.created_utc,
                            created_local: postDate.tz('Asia/Singapore'),
                            ups: post.ups,
                            downs: post.downs,
                            tags: postTags,
                            url: 'https://reddit.com' + post.permalink,
                            domain: 'reddit.com',
                            is_official: false,
                            is_pinned: false,
                            original: post,
                            errors: postErrors,
                        }
                        if(postErrors.length == 0) {
                            MRTOK.rResults[post.id] = postObj;
                        } else {
                            MRTOK.rResultsDev[post.id] = postObj;
                        }
                    });
                });
            });
        },
        
        twitter: function() {
            var tUrl = 'https://twitter-proxy.samliew.net/search/?q=';
            var tOpts = '&num=30';
            if(MRTOK.environment == 'testing') {
                tOpts = '&num=1000';
            }
            var tTerms = [
                'smrt delay',
                'smrt fault',
                'smrt breakdown',
                'mrt no service', // cater for both smrt and sbstransit, but will have false positives as "MRT" is a generic abbr
                'sbstransit -"sbstransit_ltd in" -"sbs_transit in" -"I\'m at" -youtube', // have to exclude lots of keywords as people are using location sharing apps
            ];
            tTerms.forEach(function(term) {
                $.getJSON(tUrl + encodeURIComponent(term + ' -RT') + tOpts + MRTOK.helpers.currTime('&'), function(data) {
                    $.each(data.statuses, function(k, post) {
                        var postErrors = [];
                        var postDate = moment.tz(post.created_at, 'ddd MMM DD HH:mm:ss ZZ YYYY', 'UTC');
                        var postText = post.text ? post.text : post.full_text;
                        var t = postText.toLowerCase();
                        if(MRTOK.validators.isOfficialTwitter(post) || // ignore official ones
                           !postDate.isAfter(MRTOK.settings.nHrsAgo) || // ignore outdated ones
                           post.metadata.iso_language_code !== 'en' // ignore non-english ones
                        ) {
                            return;
                        }
                        if(post.source.indexOf('ifttt') >= 0 || post.source.indexOf('facebook') >= 0) { // no reposts
                            postErrors.push('[TWITTER] ' + MRTOK.errorReasons.bannedDomain, post.source, post);
                        }
                        if(MRTOK.validators.isBannedTwitter(post)) {
                            postErrors.push('[TWITTER] ' + MRTOK.errorReasons.bannedGeneral, post.id_str, post);
                        }
                        if(MRTOK.validators.isBannedTwitterUser(post)) { // no bad accounts
                            postErrors.push('[TWITTER] ' + MRTOK.errorReasons.bannedGeneral, post.user.screen_name, post);
                        }
                        if(t.match(/(delay|fault|breakdown|no\s(train\s)?service)/) === null || // require any keywords
                           t.match(/(might|is there)\b/) !== null // no questions
                        ) {
                            postErrors.push('[TWITTER] ' + MRTOK.errorReasons.noKeywords, post);
                        }
                        if(MRTOK.validators.hasBannedKeywords(t)) {
                            postErrors.push('[TWITTER] ' + MRTOK.errorReasons.invalidKeywords, post);
                        }
                        var postTags = MRTOK.helpers.matchTags(t) || MRTOK.helpers.mapToLines(t);
                        if(!postTags || postTags.length > 2) { // no lines or too many
                            postErrors.push('[TWITTER] ' + MRTOK.errorReasons.noTags, post);
                        }
                        
                        var postObj = {
                            title: postText,
                            selftext: "",
                            selftext_html: "",
                            created_utc: postDate.unix(),
                            created_local: postDate.tz('Asia/Singapore'),
                            ups: -1,
                            downs: -1,
                            tags: postTags,
                            url: 'http://twitter.com/' + post.user.screen_name + '/status/' + post.id_str,
                            domain: 'twitter.com',
                            is_official: false,
                            is_pinned: false,
                            original: post,
                            errors: postErrors,
                        };
                        
                        if(postErrors.length == 0) {
                            MRTOK.tResults[post.id_str] = postObj;
                        } else {
                            MRTOK.tResultsDev[post.id_str] = postObj;
                        }
                    });
                });
            });
        },
        
        twitterOfficial: function() {
            var tUrl = 'https://twitter-proxy.samliew.net/lists/?id=887907955940614144';
            var tOpts = '&num=30';
            if(MRTOK.environment == 'testing') {
                tOpts = '&num=1000';
            }
            $.getJSON(tUrl + tOpts + MRTOK.helpers.currTime('&'), function(data) {
                $.each(data, function(k, post) {
                    var postErrors = [];
                    var postDate = moment.tz(post.created_at, 'ddd MMM DD HH:mm:ss ZZ YYYY', 'UTC');
                    var postText = post.text ? post.text : post.full_text;
                    var t = postText.toLowerCase();
                    var isPinned = MRTOK.validators.isPermaTweet(post);
                    if(!isPinned && // if not stickied,
                       !postDate.isAfter(MRTOK.settings.officialHrsAgo) // ignore if outdated
                    ) {
                        return;
                    }
                    if(t.match(/(nsl|ewl|nel|dtl|ccl|tel|jtl|crl|lrt)/) === null) { // require any keywords
                        postErrors.push('[OFFICIAL] ' + MRTOK.errorReasons.noKeywords, post);
                    }
                    if(MRTOK.validators.hasBannedKeywords(t)) {
                        postErrors.push('[OFFICIAL] ' + MRTOK.errorReasons.invalidKeywords, post);
                    }
                    var postTags = MRTOK.helpers.matchTags(t) || MRTOK.helpers.mapToLines(t);
                    if(!postTags || postTags.length > 2) { // no lines or too many
                        postErrors.push('[OFFICIAL] ' + MRTOK.errorReasons.noTags, post);
                    }
                    
                    var postObj = {
                        title: postText,
                        selftext: "",
                        selftext_html: "",
                        created_utc: postDate.unix(),
                        created_local: postDate.tz('Asia/Singapore'),
                        ups: -1,
                        downs: -1,
                        tags: postTags,
                        url: 'http://twitter.com/' + post.user.screen_name + '/status/' + post.id_str,
                        domain: 'twitter.com',
                        is_official: true,
                        is_pinned: isPinned,
                        original: post,
                        errors: postErrors,
                    };
                    
                    if(postErrors.length == 0) {
                        MRTOK.tResults[post.id_str] = postObj;
                    } else {
                        MRTOK.tResultsDev[post.id_str] = postObj;
                    }
                });
            });
        },
    },
    
    
    tests: {
        
        ajaxFailed: function() {
            if(MRTOK.environment !== 'testing-ajax-error') return;
            
            // Random failed ajax calls
            $.get('nothing-here.mp5');
            $.getJSON('failed-request.exe');
            $.ajax('crypto-miner.js');
        }
    },
    
    
    handleErrors: function() {
        
        $(document).ajaxError(function(evt) {
            MRTOK.ajaxErrors++;
        });
    },
    
    
    displayResults: function() {
        
        $(document).ajaxStop(function(evt) {
            var $incidents = $('#incidents');
            var $postTemplate = $incidents.find('.post').first();
            var $statusElem = $('#msg-status');
            var $taglineElem = $('#msg-tagline');
            var STATE = MRTOK.states.maybe;

            var numRedditResults = Object.keys(MRTOK.rResults).length;
            var numTwitterResults = Object.keys(MRTOK.tResults).length;
            console.log('Items that passed validation:', MRTOK.rResults, MRTOK.tResults);
            
            if((MRTOK.news.isEnabled && MRTOK.news.isDelayed) || numRedditResults > 0 || numTwitterResults > 0) {
            	STATE = MRTOK.states.no;
            }
            else if(MRTOK.ajaxErrors === 0) {
            	STATE = MRTOK.states.yes;
            }
            // else default to maybe/unknown
            
            // Visual display
            $statusElem.html(STATE.displaytext);
            $taglineElem.html(STATE.taglines[Math.floor(Math.random() * STATE.taglines.length)]);
            MRTOK.helpers.changeMobileThemeColor(STATE.color);
            $('[rel="shortcut icon"]').attr('href', STATE.icon);
            
            // If development, display possible items
            if(MRTOK.environment != 'production') {
                MRTOK.monitorSituation();
            }
                
            // End processing if everything is ok or default
            if(STATE.name !== 'no') { return; }
            
            // Set title of window/tab
            document.title = "(" + (numRedditResults + numTwitterResults) + ") " + document.title;
            
            // Display Twitter results
            Object.keys(MRTOK.tResults).forEach(function(key) {
                var post = MRTOK.tResults[key];
                var $post = $postTemplate.clone(true);
                
                if(!post.is_official) {
                    $post.find('.post-official').remove();
                }
                if(post.is_pinned) {
                    $post.addClass('post-pinned');
                }
                $post.attr('data-timestamp', post.created_utc);
                $post.find('a').attr('href', post.url);
                $post.find('.post-votes').remove();
                $post.find('.post-title').html(MRTOK.helpers.sanitizeText(post.title));
                $post.find('.post-text').remove();
                $post.find('.post-date').text(post.created_local.format(MRTOK.settings.dateFormat));
                $post.find('.post-time').text(post.created_local.format(MRTOK.settings.timeFormat));
                $post.find('.post-domain').text(post.domain);
                $post.find('.tag:not(.post-official)').filter(function(i, el) {
                    return !post.tags.includes(this.className.match(/[a-z]+$/)[0]);
                }).remove();
                $post.insertAfter($postTemplate);
            });
            
            // Display Reddit results
            Object.keys(MRTOK.rResults).forEach(function(key) {
                var post = MRTOK.rResults[key];
                var $post = $postTemplate.clone(true);
                
                if(post.is_pinned) {
                    $post.addClass('post-pinned');
                }
                $post.attr('data-timestamp', post.created_utc);
                $post.find('a').attr('href', post.url);
                if(!post.is_official) $post.find('.post-official').remove();
                $post.find('.post-votes').text(post.ups - post.downs);
                $post.find('.post-title').html(MRTOK.helpers.sanitizeText(post.title));
                $post.find('.post-text').html(post.selftext);
                $post.find('.post-date').text(post.created_local.format(MRTOK.settings.dateFormat));
                $post.find('.post-time').text(post.created_local.format(MRTOK.settings.timeFormat));
                $post.find('.post-domain').text(post.domain);
                $post.find('.tag:not(.post-official)').filter(function(i, el) {
                    return !post.tags.includes(this.className.match(/[a-z]+$/)[0]);
                }).remove();
                $post.insertAfter($postTemplate);
            });
            
            // Remove initial template
            $postTemplate.remove();
            
            // Sort according to time
            var allPosts = $('.post').sort(function(a,b) {
                return +b.dataset.timestamp - +a.dataset.timestamp;
            }).appendTo('#incident-list');
            
            // Pin pinned posts, set time to "pinned"
            $('.post-pinned').prependTo('#incident-list').find('.post-time').text('pinned').css('color', '#657786');
            
            // Remove posts without tags
            $('.tag-list').filter(function() { return this.innerText == ''; }).remove();
            
            // Display after sorting/pinning, only if there are more than 0 results
            if(numRedditResults > 0 || numTwitterResults > 0) $incidents.show();
        });
    },
    
    
    monitorSituation: function() {
        var numRedditResultsDev = Object.keys(MRTOK.rResultsDev).length;
        var numTwitterResultsDev = Object.keys(MRTOK.tResultsDev).length;
        console.info('Items that failed validation:', MRTOK.rResultsDev, MRTOK.tResultsDev);
    },
    
    
    createRedditPixel: function() {
        var i = new Image();
        i.src = "https://alb.reddit.com/snoo.gif?q=CAAHAAABAAoACQAAAAABZfOhAA==&s=35QoO86RsI3nbIIXTRmK4X2rcx690uE1BczWug-9bLQ=";
    },
    
    
    displayNews: function() {
        
        var news = MRTOK.news;
        
        // If not enabled or has expired, do nothing
        if(moment.isMoment(news.enabledUntil) && moment().isAfter(news.enabledUntil)) news.isEnabled = false;
        if(!news.isEnabled) return;
        
        // Display news
        if(news.linkUrl && news.linkUrl != '') {
            $('#news-btn').text(function(i, t) {
                return news.linkText != '' ? news.linkText : t;
            }).attr({
                'href': news.linkUrl,
                'target': '_blank'
            }).show();
        }
        $('#news-text').html(news.bodyText);
        $('#news-bar').css('background-color', news.bgcolor).show();
        
        console.log('Current time is ' + moment().format() + '. Displaying news until ' + news.enabledUntil.format() + '.');
    },
    

    init: function() {

        // Stop script from running twice
        if (this.initialised) return 'Already initialized!';
        else this.initialised = true;

        // Track time taken for init
        var startTime = new Date().getTime();

        // Detect environment
        if(location.hostname === 'mrtok.com') {
            MRTOK.environment = 'production';
            
            // Disable logging functions on prod
            console.trace = console.info = console.table = console.log = function() {};
            
            // Prompt user add to launcher
            if('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    }, function(err) {
                        console.log('ServiceWorker registration failed: ', err);
                    });
                });
            }
        }
        if(location.href.indexOf('test') > -1) {
            window.stop(); // halt meta auto refresh
            MRTOK.environment = 'testing';
            MRTOK.settings.nHrsAgo = moment().subtract(1, 'year');
            MRTOK.settings.officialHrsAgo = moment().subtract(1, 'year');
        }
        if(location.href.indexOf('test-error') > -1) {
            MRTOK.environment = 'testing-ajax-error';
        }
        
        // Init functionality
        this.helpers.injectCss();
        this.displayNews();
        this.handleErrors();
        
        if(MRTOK.environment === 'testing-ajax-error') {
            this.tests.ajaxFailed();
        }
        else {
            this.services.twitterOfficial();
            this.services.twitter();
            this.services.reddit();
        }
        
        this.displayResults();
        //this.createRedditPixel();

        // Log time taken for init
        console.log('MRTOK.Main init completed: ' + (new Date().getTime() - startTime) + 'ms');

        return this;
    }
};
MRTOK.init();
