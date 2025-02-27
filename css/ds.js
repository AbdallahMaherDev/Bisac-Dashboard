/**
 * Timer object to assist pinging
 * @method timer
 * @param callback {function} callback function
 * @param delay {int} millis to be applied as delay
 * @param id arguments to be passed to the setTimeout callback
 * @constructor
 */
var Timer = function (callback, delay, id) {
  var timerId,
    start,
    remaining = delay,
    alternatingFlag; // prevent the change of 'remaining' var if 'pause' was hit 2 times consecutively (as in case of 'pause' and 'seek')

  this.pause = function () {
    window.clearTimeout(timerId);
    if (!alternatingFlag) {
      remaining -= Date.now() - start;
    }
    alternatingFlag = true;
  };

  this.resume = function () {
    start = Date.now();
    window.clearTimeout(timerId);
    timerId = window.setTimeout(callback, remaining, id);
    alternatingFlag = false;
  };

  this.resume();
};

/**
 * Common function used to provide data to player
 * @module PlayerWidgetCommonMethods
 * @return {Function} instance of class with singleton pattern
 */
var PlayerWidgetCommonMethods = (function () {
  "use strict";

  var hasPingedVcServer = false,
    vcServerUrl = "";

  var vcPingsCache = {},
    vcServerUrlList = {};

  /**
   * Get the VcServer URL
   * @param id {string} gets specific url
   * @returns {string} VcServer URL
   */
  function getVcServerUrl(id) {
    if (typeof id === "string") {
      return vcServerUrlList[id];
    } else {
      return vcServerUrl;
    }
  }

  /**
   * Sets the VcServer URL
   * @param url VcServer URL
   * @param id {string} sets url under specific id
   */
  function setVcServerUrl(url, id) {
    if (typeof id === "string") {
      vcServerUrlList[id] = url;
    } else {
      vcServerUrl = url;
    }
  }

  /**
   * METHOD TO GET THE KEYS FROM THE JSON DATA OBJECT
   * @method getKeys
   * @param  {Object} obj [ JSon object to get an array with the keys ]
   * @return {Array} keys [ key list from the json Object ]
   */
  function getKeys(obj) {
    var keys = [],
      i;

    for (i in obj) {
      if (obj.hasOwnProperty(i)) {
        keys.push(i);
      }
    }

    return keys;
  }

  /**
   * Pings VCS server after 5 seconds
   * @param id {string} if provided, will ping url saved with specified id
   * @method pingVCS
   * @void
   */
  function pingVCS(id) {
    if (
      typeof vcServerUrl !== "undefined" ||
      (typeof id === "string" && vcServerUrlList[id])
    ) {
      var svalue, pingUrl;
      if (id) {
        svalue = getUrlParam("svalue", vcServerUrlList[id]);
        pingUrl = vcServerUrlList[id];
      } else {
        svalue = getUrlParam("svalue", vcServerUrl);
        pingUrl = vcServerUrl;
      }
      if (!vcPingsCache[svalue]) {
        hasPingedVcServer = true;
        vcPingsCache[svalue] = true;
        var request1 = new XMLHttpRequest();
        request1.open("GET", pingUrl);
        request1.send();
      }
    } else {
      throw new Error("vcServerURL not set.");
    }
  }

  /**
   * function to format shown time on the video time slider (currently used in video manager and gif generator)
   * @method prettyTime
   * @param  {String} original_seconds [ time in seconds in string format]
   * @return {Number} time [ formatted time]
   */
  function prettyTime(original_seconds) {
    var sec_num = parseInt(original_seconds, 10);
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - hours * 3600) / 60);
    var seconds = sec_num - hours * 3600 - minutes * 60;

    if (hours < 10) {
      hours = "0" + hours;
    }
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    if (seconds < 10) {
      seconds = "0" + seconds;
    }

    var time =
      (parseInt(hours) > 0 ? hours + ":" : "") + minutes + ":" + seconds;
    return time;
  }

  /**
   * function to set Adaptive flag in player config true/false depending on browsers
   * @method isVideoAdaptive
   * @return {boolean}
   */
  function isVideoAdaptive() {
    /*var ieRegex     = /(?:WOW64.+rv:|MSIE\s)(\d+\.*\d*)(?!.*Firefox)/,
                edgeRegex   = /(?:Edge\/)(\d+\.\d+\.*\d*)/,
                userAgent   = navigator.userAgent;
    
            return (
                typeof isAdaptive != 'undefined' &&
                isAdaptive &&
                !userAgent.match(ieRegex) &&
                !userAgent.match(edgeRegex)
            );*/

    return typeof isAdaptive != "undefined" && isAdaptive;
  }

  /**
   * function to return ios version
   * @method iOSversion
   * @return {number} [version of ios]
   */
  function iOSversion() {
    if (/iP(hone|od|ad)/.test(navigator.userAgent)) {
      // supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
      var v = navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
      return parseInt(v[1]);
    } else {
      return 0;
    }
  }

  /**
   * function to set type of player to load depending on browser
   * @method getPlayerUsageOrder
   * @return {Array} [string array with player name]
   */
  function getPlayerUsageOrder() {
    var playerUsageOrder = [];
    if (iOSversion() > 11 && !isVideoAdaptive()) {
      playerUsageOrder.push("basicHTML_1.4.0");
    }

    return playerUsageOrder;
  }

  /**
   * function to check if VcServer was pinged or not
   * @method hasVcServerPinged
   * @return {boolean}
   */
  function hasVcServerPinged() {
    return hasPingedVcServer;
  }

  function clearMgpAdrollStorage() {
    const mgpStorageKey = "mgp_player",
      ls = window.localStorage,
      mgpStorage = ls.getItem(mgpStorageKey),
      maxDate = new Date("2023-06-30T23:59:59").getTime(),
      currentTime = new Date().getTime();
    if (!mgpStorage || currentTime > maxDate) {
      return false;
    }
    try {
      const parsedStorage = JSON.parse(mgpStorage) || {},
        { adrolls, wiped = {} } = parsedStorage,
        prerollCommonTime = (adrolls[0] && adrolls[0].commonTime) || 0;
      if (!adrolls || wiped.adrolls || prerollCommonTime > currentTime / 1000) {
        return false;
      }
      delete parsedStorage.adrolls;
      parsedStorage.wiped = { adrolls: true };
      ls.setItem(mgpStorageKey, JSON.stringify(parsedStorage));
      return true;
    } catch (err) {
      console.warn(
        "*** MGP Adroll ***\nError parsing MGP storage key from custom script."
      );
      return false;
    }
  }

  return {
    pingVCS: pingVCS,
    getKeys: getKeys,
    prettyTime: prettyTime,
    hasVcServerPinged: hasVcServerPinged,
    getVcServerUrl: getVcServerUrl,
    setVcServerUrl: setVcServerUrl,
    clearMgpAdrollStorage: clearMgpAdrollStorage,
  };
})();
function getUrlParam(name, url) {
  if (url === "undefined") {
    url = window.location.href;
  }
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var PH_PlayerComponent = function () {
  let Self = this,
    defaults = {
      playerFlvContainerClass: ".playerFlvContainer",
      playerFlvContainer: null,
      premiumFlag: typeof premiumFlag != "undefined" ? premiumFlag : false,
      videoPlaceholder: document.getElementById("videoPlayerPlaceholder"),
      urlParams: [],
      hasPingedVcServer: false,
      isPrerollPlaying: false,
      prePlayerInitTime: null,
      isPlaylist: typeof WIDGET_SHOW_PLAYLIST_BAR !== "undefined",
      ccExperimentValue: "",
      ccExperimentEnabled: false,
      playerConfig: null,
      problemStatusResent: false,
      platform: "",
      platformFallback: "",
      autoNextEnabled: false,
      isShowPageValue: typeof isShowPage !== "undefined",
      isUtahDomainValue: typeof isUtah === "undefined" || !isUtah,
      isVrVideoValue: typeof isVr !== "undefined" && isVr,
      vrPropsValue: typeof vrProps !== "undefined" ? vrProps : "",
      videoKeyValue: typeof VIDEO_SHOW != "undefined" ? VIDEO_SHOW.vkey : "",
      playerEnvironmentValue:
        typeof playerEnvironment != "undefined" ? playerEnvironment : "",
      isSafari5Value: false,
      showNextVideoOption: "",
      uniqueId: "",
      isIOS: /iP(hone|od|ad)/.test(navigator.userAgent) ? true : false,
      isIPad:
        navigator.platform === "MacIntel" && navigator.maxTouchPoints > 0
          ? true
          : false,
      isAndroid: /Android/.test(navigator.userAgent) ? true : false,
    };

  Self.initializePlayer = function () {
    defaults.playerFlvContainer = document.querySelector(
      defaults.playerFlvContainerClass
    );
    if (defaults.playerFlvContainer) {
      Self.setData();
      Self.loadVideoPlayer();
    }
  };

  //mounted
  Self.loadVideoPlayer = function () {
    if (defaults.videoPlaceholder)
      defaults.videoPlaceholder.style.display = "block";
    defaults.prePlayerInitTime = new Date().getTime();
    setTimeout(function () {
      Self.loadPlayer();
    }, 0);
  };

  //methods
  Self.setData = function () {
    Self.setUrlParamsVars();

    defaults.platform = defaults.playerFlvContainer.dataset.platform
      ? defaults.playerFlvContainer.dataset.platform
      : "desktop";
    defaults.platformFallback = defaults.playerFlvContainer.dataset
      .platformfallback
      ? defaults.playerFlvContainer.dataset.platformfallback
      : "desktop";
    defaults.showNextVideoOption = defaults.playerFlvContainer.dataset
      .shownextvideooption
      ? defaults.playerFlvContainer.dataset.shownextvideooption
      : null;
    defaults.isSafari5Value = Self.isSafari5();
    defaults.uniqueId = defaults.playerFlvContainer.id;
    defaults.premiumFlag = Self.isPremium();
  };

  Self.setUrlParamsVars = function () {
    window.location.href.replace(
      /[?&]+([^=&]+)=([^&]*)/gi,
      function (m, key, value) {
        defaults.urlParams[key] = value;
      }
    );
  };

  Self.chargePbBlock = function () {
    const newText = document.getElementById("pb_template");
    if (!newText) return;
    const div = document.querySelector(".mgp_container");
    div.appendChild(newText);
  };

  Self.togglePlayerSizeHD = function () {
    const isChrome69 = /chrome\/([6][9])\./.test(
      navigator.userAgent.toLowerCase()
    );
    if (isChrome69) {
      setTimeout(function () {
        page_params.chrome_69_bandaid = {
          iframes: [],
        };
        document.querySelectorAll("iframe").forEach(function (item) {
          page_params.chrome_69_bandaid.iframes.push({
            element: item,
            h: item.getBoundingClientRect().height,
          });
        });
        for (var i = 0; i < page_params.chrome_69_bandaid.iframes.length; i++) {
          var el = page_params.chrome_69_bandaid.iframes[i];
          el.element.height = el.h + 1 + "px";
        }
      }, 300);
    }

    const player = document.querySelector(".mainPlayerDiv"),
      playerFlvContainer = document.querySelector(".playerFlvContainer"),
      underplayerAd = document.querySelector(".hd"),
      relatedVideos = document.querySelector(".js-relatedVideos"),
      recommendedVideos = document.querySelector(".js-recommendedVideos"),
      commentReplacement = document.querySelector(".js-commentReplacement"),
      underPlayerPlaylists = document.getElementById("under-player-playlists"),
      leftPlayerColumn = document.getElementById("hd-leftColVideoPage"),
      sectionRelateds = document.querySelector(".section-relateds"),
      sectionP2V = document.querySelector(".section-p2v"),
      nextVideoSection = document.querySelector(".nextVideoSection"),
      rightColumn = document.getElementById("hd-rightColVideoPage"),
      rightSidebar = rightColumn
        ? rightColumn
        : leftPlayerColumn.parentNode.children[1],
      sideColumn = document.querySelector(".sideColumn"),
      modelInfo = document.querySelector(".videoWrapModelInfo"),
      viewMoreCtasBtn = document.querySelector(".show-more-btn");
    let allElements = [
      player,
      playerFlvContainer,
      underplayerAd,
      relatedVideos,
      recommendedVideos,
      commentReplacement,
      underPlayerPlaylists,
      rightSidebar,
      sectionP2V,
      sectionRelateds,
      viewMoreCtasBtn,
      nextVideoSection,
      sideColumn,
      modelInfo,
    ];

    allElements = allElements.filter(function (item) {
      return item != null;
    });
    if (MG_Utils.hasClass(player, "original")) {
      MG_Utils.addClassMultiple(allElements, "wide");
      MG_Utils.removeClassMultiple(allElements, "original");
    } else {
      MG_Utils.addClassMultiple(allElements, "original");
      MG_Utils.removeClassMultiple(allElements, "wide");
    }

    if (rightSidebar && VIDEO_SHOW.isTrailerVideo && VIDEO_SHOW.canShowAds) {
      MG_Utils.addClass(rightSidebar, "trailerVideoAd");
    }

    if (typeof thumbsLayoutUpdate !== "undefined" && thumbsLayoutUpdate) {
      document.dispatchEvent(new Event("togglePlayerSize"));
    }
  };

  Self.destroyPlayer = function (playerContainerId) {
    MG_Utils.addEventHandler(window, "beforeunload", function (e) {
      MGP.destroyPlayer(playerContainerId);
    });
  };

  Self.disablePopOnControls = function () {
    const playerControls = document.querySelector(".mhp1138_controlBar"),
      playerSoundBtn = document.querySelector(".mhp1138_sound");

    if (playerControls && playerSoundBtn) {
      MG_Utils.addClass(playerControls, "js-pop");
      MG_Utils.addClass(playerSoundBtn, "js-pop");
    }
  };

  Self.triggerFullScreenDisplay = function (playerId) {
    const playerContainer = document.getElementById(playerId);
    if (playerContainer) {
      MG_Utils.addClass(playerContainer, "fullscreen");
    }
  };

  Self.getUpsellFlag = function (upsellBEFlag) {
    let upsellFlag = [];
    if (defaults.isVrVideoValue) {
      upsellFlag = upsellBEFlag && !defaults.premiumFlag ? [2160] : [];
    } else {
      upsellFlag = upsellBEFlag ? [1080] : [];
    }

    return upsellFlag;
  };

  Self.getUpsellLinkcode = function (resolution) {
    if (!resolution) return false;
    return "Player" + resolution + "pUpsell";
  };

  Self.isAdBlockOff = function () {
    return (
      (defaults.platform == "desktop" &&
        typeof page_params.holiday_promo_prem != "undefined") ||
      defaults.platform != "desktop"
    );
  };

  Self.showPreroll = function (prerollObj) {
    return (
      typeof prerollObj !== "undefined" &&
      Self.isAdBlockOff() &&
      !defaults.isVrVideoValue
    );
  };

  Self.nextVideoBtnConfig = function (nextVideoObj) {
    if (Object.keys(nextVideoObj).length !== 0) {
      let nextVideoOption = {
        title: nextVideoObj.title, // title of next video
        url: nextVideoObj.nextUrl, // url to be triggered on click of next button
        button: {
          duration: nextVideoObj.duration, // duration of next video
          enabled: true,
          thumb: nextVideoObj.thumb, // thumb of next video
          video: nextVideoObj.video, // webm video URL to show instead of the thumb
        },
        overlay: {
          enabled: false,
          channel: nextVideoObj.channelTitle || "", // channel of next video
          timeout: 10, // timeout before redirect
        },
      };

      if (nextVideoObj.isJoinPageEntry && typeof VIDEO_SHOW !== "undefined") {
        MG_Utils.ajaxCall({
          type: "GET",
          url: VIDEO_SHOW.getBuildJoinPageUrl,
          data: {
            entry_code: "VidPg-premVid-default",
            segment: VIDEO_SHOW.segment,
            viewkey: nextVideoObj.vkey,
          },
          dataType: "json",
          success: function (data) {
            if (data.success == "PASS" && data.url) {
              nextVideoOption.nextUrl = data.url;
            }
          },
        });
      }
      return nextVideoOption;
    }
    return {};
  };

  Self.buildPrerollObj = function (prerollObj) {
    let vastArray = [],
      vastObject = {};
    [].forEach.call(prerollObj.campaigns, function (campaign) {
      let clickArea = {};
      if (campaign.clickableAreasByPlatform) {
        let defaultValues = {
          video: true,
          link: true,
        };
        clickArea = campaign.clickableAreasByPlatform.pc
          ? campaign.clickableAreasByPlatform.pc
          : defaultValues;
      }

      vastObject = {
        xml: campaign.vastXml, //backend value from CMS
        vastSkipDelay: false,
        rollSettings: {
          onNth: campaign.on_nth, //backend value from CMS
          skipDelay: campaign.skip_delay, //backend value from CMS
          siteName: "Pornhub",
          forgetUserAfter: campaign.forgetUserAfter, //backend value from CMS
          campaignName: campaign.campaign_name,
          skippable: campaign.skippable, //backend value from CMS
          clickableAreas: clickArea, //The objects or areas on the screen that the user can click to visit the url
          campaignWeight: campaign.percentChance,
        },
      };
      vastArray.push(vastObject);
    });

    return vastArray;
  };

  Self.getLegacyEventsConfig = function (eventsConfig) {
    let legacyNamesMap = {
      "buttons.collapse": "collapsePlayer",
      "buttons.expand": "expandPlayer",
      "layout.horizontal": "horizontalPlayer",
      "layout.vertical": "verticalPlayer",
      "fullscreen.changed": "onFullscreen",
      "playback.paused": "onPause",
      "player.ready": "onReady",
      "player.rolls.hide": "hideRoll",
      "player.rolls.pause": "showPauseRoll",
      "player.rolls.post": "showPostRoll",
      "playback.ended": "onEnd",
      "playback.playing": "onPlay",
      "playback.seek.started": "onSeek",
      "playback.time.changed": "onTimeChange",
      "preroll.ended": "hidePreRoll",
      "preroll.started": "showPreRoll",
    };

    return Object.entries(eventsConfig).reduce(function (acc, arr) {
      let obj = {},
        fileName = legacyNamesMap[arr[0]] || arr[0];

      obj[fileName] = function (i, e, o) {
        arr[1](o, i, e);
      };

      return Object.assign({}, acc, obj);
    }, {});
  };

  Self.setSrcVideoSource = function (element, url) {
    let source = document.querySelector("#" + element + " video > source");
    source.src = url;
  };

  Self.registerPlayerEvents = function (flashvars) {
    let vcServerUrl = flashvars.vcServerUrl || null,
      vcTimersCache = {},
      events = {
        //Googlebot crawling of video
        "source.quality.ready": function (o, i, e) {
          if (
            defaults.platform == "mobile" &&
            typeof flashvars["googleCrawlUrl"] !== "undefined"
          ) {
            Self.setSrcVideoSource(i, flashvars["googleCrawlUrl"]);
          }
        },
        // Video page collapse flash playersite-speed
        "buttons.collapse": function () {
          Self.togglePlayerSizeHD();
        },
        // Video page expand flash player
        "buttons.expand": function () {
          Self.togglePlayerSizeHD();
        },
        // General seek function
        "playback.seek.started": function () {
          if (typeof htTrack != "undefined") htTrack.ptrack();
        },
        // Video is ready
        "player.ready": function (o, i, e) {
          if (typeof initVrPlayer == "function") {
            // Load script and intialize player for VR
            initVrPlayer();
          }

          if (defaults.isShowPageValue) Self.chargePbBlock();

          Self.disablePopOnControls();

          if (defaults.autoNextEnabled)
            Self.attachAutoNextCustomEvents(i, e, o);

          //clearTimeout(self.playerLoadingTimer);

          Self.disablePlaceholderImage();

          if (typeof AWARDS_OBJ !== "undefined") {
            let videoElement = document.querySelector(
              "#" + i + " .mgp_videoWrapper video"
            );
            if (!o.started && videoElement.paused) {
              let playerAPI = MGP.players[i];
              playerAPI.play();
              videoElement.muted = true;
            }
          }
        },
        // On Video Fulscreen -  HTML5 video feed trick
        "fullscreen.changed": function (o, i) {
          if (defaults.isShowPageValue) Self.triggerFullScreenDisplay(i);
        },
        // Video page pause/pre roll show Ad
        "player.rolls.pause": function () {
          if (typeof trailerPauseRoleInstance !== "undefined") {
            trailerPauseRoleInstance.openAdBlock();
          } else {
            if (typeof Pb_block !== "undefined") Pb_block.openAdBlock();
          }
        },
        // Video page pause/pre roll show Ad
        "player.rolls.post": function () {
          let autoplayCookie = MG_Utils.getCookie("autoplay");

          if (typeof Pb_block !== "undefined") {
            Pb_block.params.showBlock = true;
            Pb_block.openAdBlock();
          }

          if (
            autoplayCookie &&
            autoplayCookie === "on" &&
            typeof VueUpNextVideo !== "undefined"
          ) {
            VueUpNextVideo.showOverlay();
          }
        },
        // Fire an event when the preroll is showing
        "preroll.started": function () {
          defaults.isPrerollPlaying = true;
          const page_params =
            page_params ||
            (typeof page_extra_params != "undefined"
              ? page_extra_params
              : null);
          if (page_params) {
            page_params.prerollFired = true;
            if (defaults.isShowPageValue) {
              for (var key in page_params.zoneDetails) {
                if (!page_params.zoneDetails.hasOwnProperty(key)) continue;
                let obj = page_params.zoneDetails[key],
                  frameElement = document.getElementById(obj.frameId);
                if (typeof obj.preroll_change_url !== "undefined") {
                  frameElement &&
                    frameElement.setAttribute("src", obj.preroll_change_url);
                }
              }
            }
          }
        },
        "preroll.ended": function () {
          defaults.isPrerollPlaying = false;
        },
        "playback.playing": function (o, id) {
          var container = document.getElementById(id),
            currentTimeInSeconds =
              container && container.querySelector("video").currentTime;

          if (typeof VIDEO_SHOW !== "undefined" && VIDEO_SHOW.isQrCode) {
            if (VIDEO_SHOW.feelIsUserConnected) {
              $feel.subs.play(currentTimeInSeconds);
            }
          }

          if (vcTimersCache[id]) {
            vcTimersCache[id].resume();
          } else {
            PlayerWidgetCommonMethods.setVcServerUrl(vcServerUrl, id);
            vcTimersCache[id] = new Timer(
              PlayerWidgetCommonMethods.pingVCS,
              10000,
              id
            );
          }

          Self.hidePauseRoll();
        },
        "playback.ended": function (o, id) {
          const autoNext =
            typeof MGP.players[id].autoNext != "undefined"
              ? MGP.players[id].autoNext()
              : null;
        },
        "playback.paused": function (o, id) {
          if (typeof VIDEO_SHOW !== "undefined" && VIDEO_SHOW.isQrCode) {
            if (VIDEO_SHOW.feelIsUserConnected) {
              $feel.subs.stop();
            }
          }

          if (vcTimersCache[id]) {
            vcTimersCache[id].pause();
          }
        },
        "playback.time.changed": function (o, id) {
          const container = document.getElementById(id),
            currentTimeInSeconds =
              container && container.querySelector("video").currentTime,
            duration = container && container.querySelector("video").duration,
            countdown = document.querySelector(".countdown"),
            fixedDelay = 5,
            currTime = Math.floor(currentTimeInSeconds);

          if (typeof VIDEO_SHOW !== "undefined" && VIDEO_SHOW.isQrCode) {
            if (VIDEO_SHOW.feelIsUserConnected) {
              $feel.subs.timeupdate(currentTimeInSeconds);
            }
          }
          if (duration - currTime > fixedDelay) {
            if (typeof VIDEO_SHOW !== "undefined") VIDEO_SHOW.delay = 5;
            countdown && MG_Utils.addClass(countdown, "displayNone");
          }
          if (typeof VueUpNextVideo !== "undefined") {
            VueUpNextVideo.detectTime(currTime);
          }
        },
        "adroll.started": function (eventData) {
          const { eudsaId, eudsaUrl } = eventData,
            showAdsLinkUngated =
              typeof VIDEO_SHOW !== "undefined"
                ? VIDEO_SHOW.showAdsLink
                : false;

          if (!eudsaUrl || !showAdsLinkUngated) {
            const eudsaContainer = document.querySelector("[data-eudsa-url]");
            eudsaContainer &&
              eudsaContainer.parentElement &&
              MG_Utils.addClass(eudsaContainer.parentElement, "noStyleChange");
          } else if (eudsaId && eudsaUrl && showAdsLinkUngated) {
            const eudsaContainer = document.querySelector("[data-eudsa-url]"),
              eudsaWrapper = document.createElement("div"),
              eudsaLinkContainer = document.createElement("a"),
              eudsaBigContainer = document.createElement("div");

            eudsaWrapper.classList = "eudsaWrapper";
            eudsaLinkContainer.id = "eudsa-banner-container-link";
            eudsaBigContainer.id = "eudsa-banner-container-big";
            eudsaBigContainer.innerHTML = "Ad by TrafficJunky";
            eudsaLinkContainer.appendChild(eudsaBigContainer);
            eudsaWrapper.appendChild(eudsaLinkContainer);
            eudsaContainer && eudsaContainer.after(eudsaWrapper);
            eudsaContainer.classList = "hidden";
            if (eudsaContainer.parentElement) {
              eudsaContainer.parentElement.style.zIndex = "10";
              eudsaContainer.parentElement.style.display = "flex";
              eudsaContainer.parentElement.style.alignItems = "center";
              eudsaContainer.parentElement.style.marginBottom = "5px";
            }
            eudsaLinkContainer &&
              eudsaLinkContainer.addEventListener(
                defaults.platform == "mobile" ? "touchend" : "click",
                () => window.open(eudsaUrl, "_blank")
              );
          }
        },
      },
      playerVersion = MGP && MGP.buildInfo.playerVersion;

    return parseFloat(playerVersion) < 6.1
      ? Self.getLegacyEventsConfig(events)
      : events;
  };

  Self.getPlayerConfig = function (playerId, flashvars) {
    const hideEmbedOption =
        typeof VIDEO_SHOW !== "undefined" ? VIDEO_SHOW.hideEmbedOption : null,
      showPrerollVar =
        typeof VIDEO_EDITOR == "undefined" &&
        typeof VIDEO_MANAGE == "undefined",
      showNextVideoBtn =
        defaults.platform !== "desktop" ? !PLAYER_SHOW_NEXT_BUTTON : true;

    let preventAutoplayForAVModal =
      (document.getElementById("avModalTemplate") &&
        !MG_Utils.getCookie("av_modal")) ||
      (document.getElementById("js-ageDisclaimerModal") &&
        !MG_Utils.getCookie("accessAgeDisclaimerPH")) ||
      (document.getElementById("age-verification-wrapper") &&
        !MG_Utils.getCookie("age_verified"));

    let displayFakeFullscreenPlayer = null;

    var configJSON = {
      seekParams: { mp4: flashvars.mp4_seek, flv: "fv" },
      deviceType: defaults.platform,
      autoPlayVideo: { enabler: false },
      quickSetup: "pornhub",
      locale: flashvars.language,
      autoplay: {
        enabled:
          defaults.isShowPageValue &&
          defaults.isUtahDomainValue &&
          defaults.platform == "desktop" &&
          !preventAutoplayForAVModal
            ? JSON.parse(flashvars.autoplay)
            : typeof AWARDS_OBJ !== "undefined", // Value is determined in settings.js
        initialState: true,
        retryOnFailure: false,
        switch: "buttonbar", // 'menu' || 'buttonbar' || 'none'
      },
      startOffset: defaults.urlParams["t"] ? defaults.urlParams["t"] : 0,
      hotspots: {
        data: flashvars.hotspots ? flashvars.hotspots : [],
      },
      nextVideo:
        defaults.showNextVideoOption && showNextVideoBtn
          ? Self.nextVideoBtnConfig(flashvars.nextVideo)
          : {},
      mainRoll: {
        adaptive: {
          prebufferGoal: 40,
        },
        actionTags: flashvars.actionTags,
        mediaPriority: flashvars.mediaPriority,
        mediaDefinition: flashvars.mediaDefinitions,
        poster: flashvars.image_url,
        thumbs: {
          urlPattern: flashvars.thumbs.urlPattern,
          samplingFrequency: flashvars.thumbs.samplingFrequency,
          thumbWidth: flashvars.thumbs.thumbWidth,
          thumbHeight: flashvars.thumbs.thumbHeight,
          cdnType: flashvars.thumbs.cdnType,
        },
        videoUrl: flashvars.link_url,
        duration: flashvars.video_duration,
        title: flashvars.video_title,
        videoUnavailable: false,
        qualityUpsell: Self.getUpsellFlag(flashvars.display_hd_upsell),
        closedCaptions: flashvars.closedCaptionsFile,
        vertical:
          flashvars.isVertical == "true" || flashvars.isVertical === true,
        textLinks: typeof TEXTLINKS !== "undefined" ? TEXTLINKS : [],
      },
      hlsConfig: {
        maxInitialBufferLength: flashvars.maxInitialBufferLength,
        maxBufferLength: defaults.premiumFlag ? 60 : 20,
        maxMaxBufferLength: defaults.premiumFlag ? 60 : 20,
      },
      type: defaults.platform,
      priority: "hls",
      menu: {
        relatedUrl: flashvars.related_url,
        showOnPause: false,
      },
      features: {
        ccVisible: defaults.ccExperimentEnabled,
        ccMenu: defaults.ccExperimentEnabled,
        themeColor: "#f6921e",
        embedCode: hideEmbedOption ? "" : flashvars.embedCode,
        showHotspots: true,
        chromecast:
          typeof flashvars.chromecast != "undefined"
            ? flashvars.chromecast
            : true,
        autoFullscreen:
          typeof flashvars.autoFullscreen != "undefined"
            ? flashvars.autoFullscreen
            : true,
        cinema: playerId.getAttribute("data-enlarge") ? true : false, // Toggle size check set though player widget - player.phtml
        ignorePreferences:
          defaults.isShowPageValue && defaults.isUtahDomainValue ? false : true,
        iosAutoFullscreen: defaults.platform == "mobile",
        options: true, //New feature since LS2.4.0 allow to show the
        showAutoplayOption: playerId.getAttribute("data-showautoplayoption")
          ? true
          : false, //Showing the autoplayoption on video page only not feed
        hideControlsTimeout: 2, //Hide the bar option after the aumount of time mentionned on the option
        speed: true, //enables/disables video motion rate
        nextVideo: true, //enables/disables next video feature
        share: false, //share menu
        topBar: false, //player's topBar=> title
        volume: true, //volume
        seekPreviewBlur: false,
        chromecastSkin: false,
        oneHand: false,
        qualityInControlBar: true,
      },
      flashSettings: {
        postRollUrl: defaults.premiumFlag ? "" : flashvars.postroll_url,
        pauseRollUrl: defaults.premiumFlag ? "" : flashvars.pauseroll_url,
        htmlPauseRoll: defaults.premiumFlag ? "false" : "true",
        htmlPostRoll: defaults.premiumFlag ? "false" : "true",
        extraFlashvars: {
          oldFlash: {
            hidePostPauseRoll: defaults.premiumFlag,
          },
          fourPlay: {
            tracking: [
              {
                reportType: "qosevents",
                rollType: "video",
                rollTiming: "main",
                cdn: flashvars.cdn,
                startLagThreshold: flashvars.startLagThreshold,
                outBufferLagThreshold: flashvars.outBufferLagThreshold,
              },
            ],
          },
        },
      },
      eventTracking: {
        params: {
          cdn: flashvars.cdn,
          isp: flashvars.isp,
          geo: flashvars.geo,
          videoId:
            typeof flashvars["playbackTracking"] !== "undefined"
              ? flashvars["playbackTracking"].video_id
              : "",
        },
        viewed: {
          threshold: 60, // Poking the server after 60 seconds to track if user stayed at least one minute
          url: flashvars.viewedRequestURL,
        },
      },
      events: Self.registerPlayerEvents.call(this, flashvars),
      adRolls:
        Self.showPreroll(flashvars.adRollGlobalConfig) && showPrerollVar
          ? flashvars.adRollGlobalConfig
          : null,
      isVideoPage: defaults.isShowPageValue,
      vrProps: defaults.vrPropsValue, //Flag the vrProps
      isVr: defaults.isVrVideoValue ? true : false, // 6.2.0 expects bool

      theme: {
        themeCode: "pornhub",
        customColor: "#FF9000",
        customLogo: flashvars.customLogo,
      },
    };

    if (typeof TFE_IOSPLAYER_SWIPEFULLSCREEN !== "undefined") {
      configJSON.fullscreen = {
        enabled:
          typeof flashvars.autoFullscreen != "undefined"
            ? flashvars.autoFullscreen
            : true,
        nativeControls:
          defaults.isIOS || defaults.isIPad
            ? !displayFakeFullscreenPlayer
            : false,
        autoFullscreen: {
          android: defaults.isAndroid,
          ios: defaults.isIOS || defaults.isIPad,
        },
      };
    } else {
      configJSON.fullscreen = {
        enabled:
          typeof flashvars.autoFullscreen != "undefined"
            ? flashvars.autoFullscreen
            : true,
        nativeControls: defaults.isIOS || defaults.isIPad ? true : false,
        autoFullscreen: {
          android: defaults.isAndroid,
          ios: defaults.isIOS || defaults.isIPad,
        },
      };
    }

    if (
      typeof flashvars["playbackTracking"] !== "undefined" &&
      flashvars["playbackTracking"].app_id &&
      flashvars["playbackTracking"].eventName &&
      flashvars["playbackTracking"].munged_session_id &&
      flashvars["playbackTracking"].hostname &&
      flashvars["playbackTracking"].video_id &&
      flashvars["playbackTracking"].video_duration &&
      flashvars["playbackTracking"].video_timestamp &&
      flashvars["playbackTracking"].watch_session &&
      flashvars["playbackTracking"].sample_size
    ) {
      configJSON.eventTracking.playback = {
        appId: flashvars["playbackTracking"].app_id,
        eventName: flashvars["playbackTracking"].eventName,
        mungedSessionId: flashvars["playbackTracking"].munged_session_id,
        trackingUrl: "https://etahub.com/events",
        hostname: flashvars["playbackTracking"].hostname,
        videoId: flashvars["playbackTracking"].video_id,
        videoDuration: flashvars["playbackTracking"].video_duration,
        videoTimestamp: flashvars["playbackTracking"].video_timestamp,
        watchSession: flashvars["playbackTracking"].watch_session,
        sampleSize: flashvars["playbackTracking"].sample_size,
      };
    }

    if (typeof Etahub !== "undefined") {
      const searchEngineCookie = Etahub.getCookie(defaults.videoKeyValue);
      if (searchEngineCookie) {
        const searchEngineData = Etahub.translate(searchEngineCookie);
        configJSON.eventTracking.params["customData"] = searchEngineData;
      }
    }

    if (defaults.platform == "mobile")
      configJSON.hlsConfig["autoLevelCapping"] = 720;

    // captionType:  1 - VIDEO_AUTO_GENERATED_CAPTION, 0 - VIDEO_USER_GENERATED_CAPTION
    if (
      typeof flashvars != "undefined" &&
      flashvars.captionType != "undefined" &&
      flashvars.captionType == 1
    ) {
      configJSON.mainRoll.closedCaptions = {
        en: {
          url: flashvars.closedCaptionsFile,
          label: "English (auto-generated)",
        },
      };
    }
    return configJSON;
  };

  Self.loadPlayer = function () {
    if (playerObjList.hasOwnProperty(defaults.uniqueId)) {
      const embedId = playerObjList[defaults.uniqueId].flashvars.embedId,
        flashvars = window["flashvars_" + embedId],
        playerContainerId = "playerDiv_" + embedId,
        playerId = window[playerContainerId],
        playerElement = document.getElementById(playerContainerId);

      defaults.playerConfig = JSON.parse(JSON.stringify(flashvars));

      if (
        typeof flashvars !== "undefined" &&
        typeof playerId !== "undefined" &&
        typeof MGP != "undefined"
      ) {
        if (!playerId.getAttribute("data-processed")) {
          playerId.setAttribute("data-processed", 1);

          if (defaults.isSafari5Value && playerElement) {
            playerElement.classList.add("unsupported-safari");
          }

          if (!!flashvars.closedCaptionsFile) {
            Self.setCcExperimentValues();
          }

          PlayerWidgetCommonMethods.clearMgpAdrollStorage();

          MGP.createPlayer(
            playerContainerId,
            Self.getPlayerConfig.call(this, playerId, flashvars)
          );
        }

        if (defaults.platform === "desktop") {
          Self.destroyPlayer(playerContainerId);
        }
      }
    }
  };

  Self.setCcExperimentValues = function () {
    if (typeof PH_Storage != "undefined") {
      const playerData = PH_Storage.getItem("mhp1138_player"),
        hasCcData = playerData ? playerData["closedCaptions"] : null;

      if (hasCcData) {
        defaults.ccExperimentEnabled = hasCcData.visible;
        defaults.ccExperimentValue = hasCcData.visible
          ? "forcedClosedCaptionsOn"
          : "forcedClosedCaptionsOff";
      } else {
        defaults.ccExperimentEnabled = true;
        defaults.ccExperimentValue = "forcedClosedCaptionsOn";
      }
    }
  };

  Self.attachAutoNextCustomEvents = function (playerId, element, object) {
    const autoNext =
      typeof MGP.players[playerId] != "undefined" &&
      typeof MGP.players[playerId].autoNext != "undefined"
        ? MGP.players[playerId].autoNext()
        : null;

    if (autoNext) {
      //pause autoNext count when user performs any other action outside player element
      document.addEventListener("click", function (e) {
        autoNext.hide();
      });
      //pause autoNext count when user switches current tab
      window.addEventListener("blur", function (e) {
        autoNext.hide();
      });
    }
  };

  Self.disablePlaceholderImage = function () {
    const closestImage =
      defaults.playerFlvContainer.parentElement.parentElement.querySelector(
        ".videoElementPoster"
      );
    if (closestImage) {
      MG_Utils.addClass(closestImage, "displayNone");
    }
  };

  Self.hidePauseRoll = function () {
    if (typeof trailerPauseRoleInstance !== "undefined") {
      trailerPauseRoleInstance.closeAdBlock();
    } else {
      if (typeof Pb_block !== "undefined") {
        Pb_block.closeAdBlock();
      }
    }
  };

  //computed
  Self.isSafari5 = function () {
    return (
      !!navigator.userAgent.match(" Safari/") &&
      !navigator.userAgent.match(" Chrom") &&
      !!navigator.userAgent.match(" Version/5.")
    );
  };
  Self.isPremium = function () {
    return defaults.premiumFlag == true;
  };
};
var phPlayerComponent = new PH_PlayerComponent();

/**
 * Module for Setting the right format of the Delight VR video player
 * @module VrFormatFinder
 * @return {Function} setVrFormat,pingVcsHandler
 */
var VrFormatFinder = (function () {
  "use strict";

  /**
   * Function to set correct format depending on projection and streotype
   * @method findFormat
   * @param {Number} projection
   * @param {Number} stereoType
   * @return {String} vrFormat [streotype 360/180 degree left right/top bottom]
   */
  function findFormat(projection, stereoType) {
    var vrFormat;

    switch (stereoType) {
      case 1:
        vrFormat = projection == 2 ? "STEREO_360_LR" : "STEREO_180_LR";
        break;
      case 2:
        vrFormat = projection == 2 ? "STEREO_360_TB" : "STEREO_180_TB";
        break;
      case 3:
        vrFormat = projection == 2 ? "STEREO_360_LR" : "STEREO_FLAT_LR";
        break;
      case 4:
        vrFormat = projection == 2 ? "STEREO_360_TB" : "STEREO_FLAT_TB";
        break;
      case "MONO":
        vrFormat = projection == 1 ? "MONO_FLAT" : "MONO_360";
        break;
      default:
        vrFormat = "MONO_360";
    }

    return vrFormat;
  }

  /**
   * Function setting Setting any variable in fallback url
   * @method updateQueryStringParameter
   * @param {String} key [key of the url param]
   * @param {String} value [vlalue of key of the url param]
   * @param {String} uri [actual url]
   * @return {String} url with added new params
   */
  function updateQueryStringParameter(key, value, uri) {
    var re = new RegExp("([?&])" + key + "=.*?(&|#|$)", "i");
    if (value === undefined) {
      if (uri.match(re)) {
        return uri.replace(re, "$1$2");
      } else {
        return uri;
      }
    } else {
      if (uri.match(re)) {
        return uri.replace(re, "$1" + key + "=" + value + "$2");
      } else {
        var hash = "";
        if (uri.indexOf("#") !== -1) {
          hash = uri.replace(/.*#/, "#");
          uri = uri.replace(/#.*/, "");
        }
        var separator = uri.indexOf("?") !== -1 ? "&" : "?";
        return uri + separator + key + "=" + value + hash;
      }
    }
  }

  /**
   * Function to add vr format attributes in delight player
   * @method setVrFormat
   * @param {Element} delightElement [delight video player element]
   * @void
   */
  function setVrFormat(delightElement) {
    if (delightElement) {
      var format = findFormat(vrProps.projection, vrProps.stereoType),
        fallbackCOR = delightElement.getAttribute("cors-fallback-url"),
        formattedCorUrl = updateQueryStringParameter(
          "format",
          format,
          fallbackCOR
        );

      // Sending the right format to video attribute
      delightElement.setAttribute("format", format);

      // Sending the right format to fallback url format params
      delightElement.setAttribute("cors-fallback-url", formattedCorUrl);
    }
  }

  /**
   * Function to play vcs server when player is played
   * @method pingVcsHandler
   * @param {Element} delightElement [delight video player element]
   * @void
   */
  function pingVcsHandler(delightElement) {
    if (delightElement) {
      var myKeyList = PlayerWidgetCommonMethods.getKeys(playerObjList),
        embedId = playerObjList[myKeyList[0]].flashvars.embedId,
        flashvars = window["flashvars_" + embedId],
        vcServerUrl = flashvars.vcServerUrl || null;

      delightElement.addEventListener("play", function (e) {
        PlayerWidgetCommonMethods.setVcServerUrl(vcServerUrl);
        PlayerWidgetCommonMethods.pingVCS;
      });
    }
  }

  return {
    setVrFormat: setVrFormat,
    pingVcsHandler: pingVcsHandler,
  };
})();

// Ping VcServer for vr videos
(function () {
  var videoPlaceHolder = document.getElementById("videoPlayerPlaceholder"),
    delightElement = document.querySelector("dl8-video");

  if (typeof VIDEO_SHOW != "undefined" && VIDEO_SHOW.isVr && delightElement) {
    videoPlaceHolder ? (videoPlaceHolder.style.display = "block") : "";
    VrFormatFinder.setVrFormat(delightElement);

    if (!VIDEO_SHOW.isPremium) VrFormatFinder.pingVcsHandler(delightElement);
  } else {
    phPlayerComponent.initializePlayer();
  }
})();
