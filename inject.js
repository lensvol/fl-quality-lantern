(function () {
    const DONE = 4;
    const ALWAYS_SHOWN_TYPES = [
        "DifficultyRollFailureMessage",
        "DifficultyRollSuccessMessage",
        "ActionsRefreshedMessage",
        "AreaChangeMessage",
        "FateBranchCurrencyUsedMessage",
        "FatePointChangeMessage",
        "STORE_ITEM_CURRENCY_USED_MESSAGE", /// ??? WTF, Seamus?
        "DeckRefreshedMessage",
    ];

    function debug(message) {
        console.debug(`[FL Quality Lantern] ${message}`);
    }

    function log(message) {
        console.log(`[FL Quality Lantern] ${message}`);
    }

    function revealQualities(entry) {
        let wasModified = false;

        for (quality of entry.qualityRequirements) {
            if (quality.category === "Hidden") {
                quality.category = "Story";
                quality.name = "Hidden Quality";
                debug(`Hidden quality: ${quality.qualityName}  (ID: ${quality.id})`);
                wasModified = true;
            }
        }

        return wasModified;
    }

    function parseResponse(response) {
        if (this.readyState !== DONE) {
            return;
        }

        let targetUrl = response.currentTarget.responseURL;

        if (!targetUrl.includes("fallenlondon")) {
            return;
        }

        if (!(targetUrl.includes("/storylet")
            || targetUrl.includes("/choosebranch"))) {
            return;
        }

        let isModified = false;

        let data = JSON.parse(response.target.responseText);

        if (targetUrl.endsWith("/choosebranch")) {
            if ("messages" in data) {
                for (const message of data.messages) {
                    const isHidden = !("priority" in message) || message.priority > 2;
                    if (isHidden && !ALWAYS_SHOWN_TYPES.includes(message["type"])) {
                        message.priority = 2;
                        message.message += "<em> (hidden)</em>";
                        isModified = true;
                    }

                    if (message["type"] === "QualityExplicitlySetMessage"
                        || message["type"] === "StandardQualityChangeMessage") {
                        message.message += ` (${message.possession.nameAndLevel})`;
                        isModified = true;
                    }
                }
            }
        }

        if (targetUrl.endsWith("/api/storylet")
            || targetUrl.endsWith("/api/storylet/goback")
            || targetUrl.endsWith("/api/storylet/begin")) {
            if ("storylet" in data) {
                isModified = revealQualities(data.storylet) || isModified;

                if ("childBranches" in data.storylet) {
                    for (const branch of data.storylet.childBranches) {
                        isModified = revealQualities(branch) || isModified;
                    }
                }
            }

            if ("storylets" in data) {
                for (const storylet of data.storylets) {
                    isModified = revealQualities(storylet) || isModified;
                }
            }
        }

        if (isModified) {
            setFakeXhrResponse(this, 200, JSON.stringify(data));
        }
    }

    function openBypass(original_function) {
        return function (method, url, async) {
            this._targetUrl = url;
            this.addEventListener("readystatechange", parseResponse);
            return original_function.apply(this, arguments);
        };
    }

    function setFakeXhrResponse(request, status, responseText) {
        Object.defineProperty(request, 'responseText', {writable: true});
        Object.defineProperty(request, 'readyState', {writable: true});
        Object.defineProperty(request, 'status', {writable: true});

        request.responseText = responseText;
        request.readyState = DONE;
        request.status = 200;

        request.onreadystatechange();
    }

    debug("Setting up API interceptors.");
    XMLHttpRequest.prototype.open = openBypass(XMLHttpRequest.prototype.open);
}())
