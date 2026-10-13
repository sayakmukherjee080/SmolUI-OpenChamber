"use strict";
(() => {
  // node_modules/@openchamber/sdk/dist/api-version.js
  var OPENCHAMBER_SDK_CHANNEL = "openchamber.sdk";
  var OPENCHAMBER_SDK_API_VERSION = 1;

  // node_modules/@openchamber/sdk/dist/scrollbar-style.js
  var GUEST_SCROLLING_ATTRIBUTE = "data-oc-scrolling";
  var GUEST_SCROLLBAR_CSS = `
:root {
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 40%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 65%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [${GUEST_SCROLLING_ATTRIBUTE}] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [${GUEST_SCROLLING_ATTRIBUTE}]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;
  function installGuestScrollbarActivity(doc) {
    const root2 = doc.documentElement;
    if (root2.hasAttribute("data-oc-scrollbar-activity"))
      return;
    root2.setAttribute("data-oc-scrollbar-activity", "");
    const timers = /* @__PURE__ */ new WeakMap();
    doc.addEventListener("scroll", (event) => {
      const target = event.target === doc ? root2 : event.target;
      if (!(target instanceof Element))
        return;
      if (!target.hasAttribute("data-oc-scrolling"))
        target.setAttribute("data-oc-scrolling", "");
      const pending = timers.get(target);
      if (pending !== void 0)
        clearTimeout(pending);
      timers.set(target, setTimeout(() => {
        timers.delete(target);
        target.removeAttribute("data-oc-scrolling");
      }, 1e3));
    }, { capture: true, passive: true });
  }
  var GUEST_SCROLLBAR_SCRIPT = `(${installGuestScrollbarActivity.toString()})(document);`;

  // node_modules/@openchamber/sdk/dist/workspace.js
  var GUEST_STORAGE_KEY_MAX = 128;
  var GUEST_STORAGE_VALUE_BYTES = 65536;

  // node_modules/@openchamber/sdk/dist/shells.js
  var GUEST_SHELL_ID_MAX = 128;
  var GUEST_SHELL_OUTPUT_TAIL_MAX = 65536;

  // node_modules/@openchamber/sdk/dist/status-controls.js
  var GUEST_STATUS_CONTROLS_MAX = 4;
  var GUEST_STATUS_CONTROL_ID = /^[a-z][a-z0-9-]{0,39}$/;
  var GUEST_STATUS_CONTROL_LABEL_MAX = 60;
  var GUEST_STATUS_CONTROL_OPTIONS_MAX = 16;
  var GUEST_STATUS_CONTROL_VALUE_MAX = 80;
  var isControlObject = (value) => Object(value) === value && !Array.isArray(value);
  var hasOnlyKeys = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
  var isLabel = (value) => String(value) === value && value.length >= 1 && value.length <= GUEST_STATUS_CONTROL_LABEL_MAX;
  var isValue = (value) => String(value) === value && value.length >= 1 && value.length <= GUEST_STATUS_CONTROL_VALUE_MAX;
  var isGuestStatusControls = (controls) => {
    if (!Array.isArray(controls) || controls.length > GUEST_STATUS_CONTROLS_MAX)
      return false;
    const ids = /* @__PURE__ */ new Set();
    for (const control of controls) {
      if (!isControlObject(control) || !GUEST_STATUS_CONTROL_ID.test(control.id) || !isLabel(control.label))
        return false;
      if (control.disabled !== void 0 && control.disabled !== true && control.disabled !== false)
        return false;
      if (ids.has(control.id))
        return false;
      ids.add(control.id);
      if (control.kind === "button") {
        if (!hasOnlyKeys(control, ["kind", "id", "label", "disabled"]))
          return false;
        continue;
      }
      if (control.kind !== "select" || !hasOnlyKeys(control, ["kind", "id", "label", "value", "options", "disabled"]))
        return false;
      if (!isValue(control.value) || !Array.isArray(control.options) || control.options.length < 1 || control.options.length > GUEST_STATUS_CONTROL_OPTIONS_MAX)
        return false;
      const values = /* @__PURE__ */ new Set();
      for (const option of control.options) {
        if (!isControlObject(option) || !hasOnlyKeys(option, ["value", "label"]) || !isValue(option.value) || !isLabel(option.label) || values.has(option.value))
          return false;
        values.add(option.value);
      }
      if (!values.has(control.value))
        return false;
    }
    return true;
  };

  // node_modules/@openchamber/sdk/dist/file-editor.js
  var GUEST_FILE_EDITOR_CONTENT_MAX = 2e7;
  var GUEST_FILE_EDITOR_VERSION_MAX = 256;
  var fileEditorPayloadSize = (value) => "bytes" in value ? value.bytes.byteLength : value.content.length;
  var sameFileEditorDocument = (left, right) => {
    if (left.path !== right.path || left.readOnly !== right.readOnly)
      return false;
    if (left.encoding === "text" || right.encoding === "text") {
      return left.encoding === "text" && right.encoding === "text" && left.content === right.content;
    }
    if (left.bytes.byteLength !== right.bytes.byteLength)
      return false;
    for (let index = 0; index < left.bytes.byteLength; index += 1) {
      if (left.bytes[index] !== right.bytes[index])
        return false;
    }
    return true;
  };

  // node_modules/@openchamber/sdk/dist/popover.js
  var GUEST_POPOVER_ID = /^[A-Za-z0-9_-]{1,80}$/;
  var GUEST_POPOVER_COORDINATE_MAX = 1e5;
  var GUEST_POPOVER_WIDTH_MIN = 160;
  var GUEST_POPOVER_WIDTH_MAX = 640;
  var GUEST_POPOVER_HEIGHT_MIN = 48;
  var GUEST_POPOVER_HEIGHT_MAX = 480;
  var GUEST_POPOVER_DATA_MAX = 16e3;
  var GUEST_POPOVER_DATA_DEPTH_MAX = 32;
  var GUEST_POPOVER_SIDES = ["left", "right", "top", "bottom"];
  var hasBoundedJsonTree = (value, depth = 0, budget = { remaining: GUEST_POPOVER_DATA_MAX }) => {
    if (--budget.remaining < 0 || depth >= GUEST_POPOVER_DATA_DEPTH_MAX)
      return false;
    if (value === null)
      return true;
    const children = Array.isArray(value) ? value : Object(value) === value ? Object.values(value) : [];
    for (const item of children) {
      if (!hasBoundedJsonTree(item, depth + 1, budget))
        return false;
    }
    return true;
  };
  var isFiniteJson = (value) => {
    if (value === null || value === true || value === false)
      return true;
    if (Array.isArray(value))
      return Object.keys(value).every((key) => /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length) && value.every(isFiniteJson);
    if (Object(value) === value) {
      const prototype = Object.getPrototypeOf(value);
      return (prototype === null || prototype === Object.prototype) && Object.values(value).every(isFiniteJson);
    }
    return String(value) === value || Number.isFinite(value);
  };
  var isGuestPopoverRequest = (request) => {
    try {
      if (String(request.id) !== request.id || !GUEST_POPOVER_ID.test(request.id) || !Number.isFinite(request.anchor.x) || Math.abs(request.anchor.x) > GUEST_POPOVER_COORDINATE_MAX || !Number.isFinite(request.anchor.y) || Math.abs(request.anchor.y) > GUEST_POPOVER_COORDINATE_MAX || !Number.isFinite(request.anchor.width) || !Number.isFinite(request.anchor.height) || request.anchor.width <= 0 || request.anchor.height <= 0 || request.anchor.width > GUEST_POPOVER_COORDINATE_MAX || request.anchor.height > GUEST_POPOVER_COORDINATE_MAX || !Number.isInteger(request.width) || request.width < GUEST_POPOVER_WIDTH_MIN || request.width > GUEST_POPOVER_WIDTH_MAX || !Number.isInteger(request.height) || request.height < GUEST_POPOVER_HEIGHT_MIN || request.height > GUEST_POPOVER_HEIGHT_MAX || request.side !== void 0 && !GUEST_POPOVER_SIDES.includes(request.side) || request.focus !== void 0 && request.focus !== true && request.focus !== false || !hasBoundedJsonTree(request.data) || !isFiniteJson(request.data))
        return false;
      return JSON.stringify(request.data).length <= GUEST_POPOVER_DATA_MAX;
    } catch {
      return false;
    }
  };

  // node_modules/@openchamber/sdk/dist/contract.js
  var GUEST_FILE_STAT_KINDS = ["file", "directory", "other", "missing"];
  var isStartSessionResult = (value) => Boolean(value && "sessionId" in value);
  var isPromptResult = (value) => Boolean(value && "sent" in value && !("sessionId" in value));
  var GUEST_COMMIT_SHA = /^[0-9a-f]{7,64}$/i;
  var isGuestCommitSha = (value) => GUEST_COMMIT_SHA.test(value);
  var GUEST_TOAST_MAX = 500;
  var GUEST_CLIPBOARD_TEXT_MAX = 32e3;
  var GUEST_COMPOSE_TEXT_MAX = 16e3;
  var GUEST_ATTACH_ID_MAX = 128;
  var GUEST_ATTACH_TITLE_MAX = 200;
  var GUEST_ATTACH_URL_MAX = 2e3;
  var GUEST_ATTACH_TEXT_MAX = 16e3;
  var GUEST_ATTACH_AUTHOR_MAX = 80;
  var GUEST_ATTACH_BRANCH_MAX = 200;
  var GUEST_ATTACH_DATA_MAX = 16e3;
  var GUEST_REQUEST_PATH_MAX = 2e3;
  var GUEST_REQUEST_TIMEOUT_MS = 2e4;
  var GUEST_FILE_PATH_MAX = 1024;
  var GUEST_FILE_CONTENT_MAX = 2e6;
  var GUEST_GENERATE_PROMPT_MAX = 64e3;
  var GUEST_GENERATE_SYSTEM_MAX = 8e3;
  var GUEST_GENERATE_OUTPUT_TOKENS_MAX = 4e3;
  var GUEST_GENERATE_TIMEOUT_MS = 9e4;
  var GUEST_BADGE_MAX = 999;
  var GUEST_FRAME_HEIGHT_MAX = 1e4;
  var GUEST_RESOLVE_ERROR_MAX = 500;
  var HOST_REQUEST_ERROR_CODES = [
    "HOST_UNAVAILABLE",
    "HOST_TIMEOUT",
    "HOST_REJECTED",
    "DISCONNECTED",
    "DISABLED",
    "BAD_PATH",
    "NO_INTEGRATION",
    "NO_SERVICE",
    "SERVICE_FAILED",
    "NO_SESSION",
    "SESSION_BUSY",
    "NOT_GRANTED",
    "NO_DIRECTORY",
    "NOT_FOUND",
    "FILE_TOO_LARGE",
    "DENIED",
    "NO_MODEL",
    "MODEL_FAILED",
    "UNSUPPORTED"
  ];
  var SERVICE_STATUS_VALUES = ["stopped", "starting", "ready", "failed"];
  var hostRequestErrorCodeSet = new Set(HOST_REQUEST_ERROR_CODES);
  var isHostRequestErrorCode = (value) => hostRequestErrorCodeSet.has(value);
  var resolveHostRequestErrorCode = (value) => value && isHostRequestErrorCode(value) ? value : "HOST_REJECTED";
  var isJsonValue = (value) => {
    if (value === void 0)
      return false;
    if (value === null || value === true || value === false)
      return true;
    if (String(value) === value)
      return true;
    if (Number(value) === value)
      return Number.isFinite(value);
    if (Array.isArray(value))
      return value.every(isJsonValue);
    if (Object(value) === value)
      return Object.values(value).every(isJsonValue);
    return false;
  };
  var isAttachData = (value) => isJsonValue(value) && JSON.stringify(value).length <= GUEST_ATTACH_DATA_MAX;
  var clampBranch = (value) => value?.trim().slice(0, GUEST_ATTACH_BRANCH_MAX) ?? "";
  var clampAttachRequest = (request) => {
    const id = request.id.trim().slice(0, GUEST_ATTACH_ID_MAX);
    const title = request.title.trim().slice(0, GUEST_ATTACH_TITLE_MAX);
    const url = request.url.trim().slice(0, GUEST_ATTACH_URL_MAX);
    const text = request.text?.trim().slice(0, GUEST_ATTACH_TEXT_MAX);
    const author = request.author?.trim().slice(0, GUEST_ATTACH_AUTHOR_MAX);
    const kind = request.kind === "pull" ? "pull" : "issue";
    const next = {
      providerId: request.providerId.trim(),
      id,
      title: title || id,
      url,
      kind
    };
    if (text) {
      next.text = text;
    }
    if (author) {
      next.author = author;
    }
    if (kind === "pull") {
      const head = clampBranch(request.branches?.head);
      const base = clampBranch(request.branches?.base);
      if (head && base) {
        next.branches = { head, base };
      }
    }
    if (isAttachData(request.data)) {
      next.data = request.data;
    }
    return next;
  };
  var clampStartSessionRequest = (request) => {
    const next = clampAttachRequest(request);
    if (request.projectId)
      next.projectId = request.projectId;
    if (request.navigation)
      next.navigation = request.navigation;
    if (request.worktree) {
      next.worktree = request.worktree;
    }
    return next;
  };
  var clampPromptRequest = (request) => {
    const next = {
      text: request.text.trim().slice(0, GUEST_COMPOSE_TEXT_MAX)
    };
    if (request.send) {
      next.send = true;
    }
    return next;
  };
  var clampBadgeCount = (count) => {
    if (count === null || !Number.isFinite(count))
      return null;
    return Math.min(GUEST_BADGE_MAX, Math.max(0, Math.round(count)));
  };
  var clampFrameHeight = (height) => {
    if (!Number.isFinite(height))
      return 0;
    return Math.min(GUEST_FRAME_HEIGHT_MAX, Math.max(0, Math.ceil(height)));
  };
  var isGuestFilePath = (value) => value.length > 0 && value.length <= GUEST_FILE_PATH_MAX && !value.includes("\0") && !value.includes("\\");
  var isGuestRequestPath = (value) => {
    if (!value.startsWith("/") || value.includes("\0") || value.includes("\\") || value.includes("://")) {
      return false;
    }
    if (value.length > GUEST_REQUEST_PATH_MAX) {
      return false;
    }
    const segments = value.split("/");
    return !segments.some((segment) => segment === "." || segment === "..");
  };
  var serviceStatusSet = new Set(SERVICE_STATUS_VALUES);
  var isServiceStatusResult = (value) => Boolean(value && "status" in value && serviceStatusSet.has(String(value.status)) && !("body" in value));
  var isGuestRequestResult = (value) => Boolean(value && "status" in value && "body" in value && Number.isInteger(value.status));
  var isFileReadResult = (value) => Boolean(value && "content" in value && String(value.content) === value.content);
  var isFileWriteResult = (value) => Boolean(value && "written" in value && value.written === true);
  var isFileListResult = (value) => Boolean(value && "entries" in value && Array.isArray(value.entries));
  var fileStatKindSet = new Set(GUEST_FILE_STAT_KINDS);
  var isFileStatResult = (value) => Boolean(value && "kind" in value && "size" in value && fileStatKindSet.has(String(value.kind)) && Number.isFinite(value.size));
  var isGenerateResult = (value) => Boolean(value && "text" in value && String(value.text) === value.text && !("status" in value));
  var HOST_PUSH_TYPES = /* @__PURE__ */ new Set([
    "workspace",
    "shells",
    "ready",
    "directory",
    "session",
    "connection",
    "settings",
    "session-lifecycle",
    "item",
    "resolve",
    "action",
    "status-control-event",
    "popover-closed",
    "file-open",
    "file-snapshot",
    "file-saved"
  ]);
  var asWireRecord = (data) => Object(data) === data ? data : null;
  var isNonEmptyString = (value) => String(value) === value && value.length > 0;
  var readResultMessage = (wire) => {
    if (!isNonEmptyString(wire.id))
      return null;
    if (wire.ok === true) {
      const message = {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: true
      };
      if (Object(wire.payload) === wire.payload) {
        message.payload = wire.payload;
      }
      return message;
    }
    if (wire.ok === false && isNonEmptyString(wire.error)) {
      return {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: false,
        error: wire.error,
        code: resolveHostRequestErrorCode(isNonEmptyString(wire.code) ? wire.code : void 0)
      };
    }
    return null;
  };
  var readHostMessage = (data) => {
    const wire = asWireRecord(data);
    if (!wire || wire.channel !== OPENCHAMBER_SDK_CHANNEL || wire.v !== OPENCHAMBER_SDK_API_VERSION)
      return null;
    if (wire.type === "result")
      return readResultMessage(wire);
    if (!HOST_PUSH_TYPES.has(String(wire.type)) || Object(wire.payload) !== wire.payload)
      return null;
    return wire;
  };

  // node_modules/@openchamber/sdk/dist/host.js
  var isKeyEvent = (event) => "key" in event && "metaKey" in event && "ctrlKey" in event;
  var isSaveShortcut = (event) => (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s";
  var HostRequestError = class extends Error {
    code;
    constructor(code, message) {
      super(message);
      this.name = "HostRequestError";
      this.code = code;
    }
  };
  var rejectBadPath = () => Promise.reject(new HostRequestError("BAD_PATH", 'Request path must start with "/" and stay on the declared origin.'));
  var rejectBadFilePath = () => Promise.reject(new HostRequestError("BAD_PATH", `File path must be 1 to ${GUEST_FILE_PATH_MAX} characters without NUL or backslash.`));
  var deviceStorageScope = (options) => {
    if (options === void 0)
      return void 0;
    if (Object(options) !== options || Array.isArray(options) || options.scope !== void 0 && options.scope !== "instance" && options.scope !== "device") {
      throw new HostRequestError("HOST_REJECTED", 'Storage scope must be "instance" or "device".');
    }
    return options.scope === "device" ? "device" : void 0;
  };
  var nextId = (n) => {
    n.value += 1;
    return `oc-${n.value}`;
  };
  var connectHost = (options = {}) => {
    const target = options.target ?? ("window" in globalThis ? window : null);
    if (!target) {
      throw new HostRequestError("HOST_UNAVAILABLE", "No window. connectHost runs in a browser frame.");
    }
    const acceptSource = options.acceptSource ?? ((source) => source === target.parent);
    const requestTimeoutMs = options.requestTimeoutMs ?? GUEST_REQUEST_TIMEOUT_MS;
    const readyListeners = /* @__PURE__ */ new Set();
    const directoryListeners = /* @__PURE__ */ new Set();
    const sessionListeners = /* @__PURE__ */ new Set();
    const lifecycleListeners = /* @__PURE__ */ new Set();
    const connectionListeners = /* @__PURE__ */ new Set();
    const settingsListeners = /* @__PURE__ */ new Set();
    const itemListeners = /* @__PURE__ */ new Set();
    const statusControlListeners = /* @__PURE__ */ new Set();
    const popoverClosedListeners = /* @__PURE__ */ new Set();
    let resolveHandler = null;
    let actionHandler = null;
    const fileOpenListeners = /* @__PURE__ */ new Set();
    const fileSavedListeners = /* @__PURE__ */ new Set();
    let fileSnapshotHandler = null;
    let lastFile = null;
    let saveShortcutInstalled = false;
    const pending = /* @__PURE__ */ new Map();
    const workspaceListeners = /* @__PURE__ */ new Map();
    const shellsListeners = /* @__PURE__ */ new Map();
    let disposed = false;
    const ids = { value: 0 };
    let lastReady = null;
    let lastLifecycle = null;
    let popoverPointerActive = false;
    let popoverFocusActive = false;
    let popoverActivityReported = null;
    const lifecycleFromSession = (session) => {
      if (!session)
        return null;
      return {
        sessionId: session.id,
        phase: session.busy ? "started" : "completed"
      };
    };
    const post = (message) => {
      target.parent.postMessage(message, "*");
    };
    const emit = (listeners, value) => {
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.error(error);
        }
      }
    };
    const onMessage = (event) => {
      if (!(event instanceof MessageEvent))
        return;
      if (!acceptSource(event.source))
        return;
      const message = readHostMessage(event.data);
      if (!message)
        return;
      if (message.type === "workspace") {
        const listener = workspaceListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "shells") {
        const listener = shellsListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "ready") {
        lastReady = message.payload;
        lastLifecycle = lifecycleFromSession(message.payload.session);
        emit(readyListeners, message.payload);
        emit(directoryListeners, message.payload.directory);
        emit(sessionListeners, message.payload.session);
        if (lastLifecycle) {
          emit(lifecycleListeners, lastLifecycle);
        }
        emit(connectionListeners, message.payload.connection);
        emit(settingsListeners, message.payload.settings);
        emit(itemListeners, message.payload.item);
        return;
      }
      if (message.type === "directory") {
        if (lastReady) {
          lastReady = { ...lastReady, directory: message.payload.directory };
        }
        emit(directoryListeners, message.payload.directory);
        return;
      }
      if (message.type === "session") {
        if (lastReady) {
          lastReady = { ...lastReady, session: message.payload.session };
        }
        if (!message.payload.session) {
          lastLifecycle = null;
        } else if (lastLifecycle?.sessionId !== message.payload.session.id) {
          lastLifecycle = lifecycleFromSession(message.payload.session);
        }
        emit(sessionListeners, message.payload.session);
        return;
      }
      if (message.type === "session-lifecycle") {
        lastLifecycle = message.payload;
        emit(lifecycleListeners, message.payload);
        return;
      }
      if (message.type === "connection") {
        if (lastReady) {
          lastReady = { ...lastReady, connection: message.payload.connection };
        }
        emit(connectionListeners, message.payload.connection);
        return;
      }
      if (message.type === "settings") {
        if (lastReady) {
          lastReady = { ...lastReady, settings: message.payload.settings };
        }
        emit(settingsListeners, message.payload.settings);
        return;
      }
      if (message.type === "item") {
        if (lastReady) {
          lastReady = { ...lastReady, item: message.payload.item };
        }
        emit(itemListeners, message.payload.item);
        return;
      }
      if (message.type === "status-control-event") {
        emit(statusControlListeners, message.payload);
        return;
      }
      if (message.type === "popover-closed") {
        emit(popoverClosedListeners, message.payload);
        return;
      }
      if (message.type === "action") {
        const answer = (payload) => {
          if (!disposed)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "action-result",
              id: message.id,
              payload
            });
        };
        const handler = actionHandler;
        if (!handler) {
          answer({ ok: false, error: "This extension does not handle background actions." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then(() => answer({ ok: true }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ ok: false, error: (text || "Action failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      if (message.type === "file-open") {
        const next = message.payload;
        if (lastFile && sameFileEditorDocument(lastFile, next))
          return;
        lastFile = next;
        emit(fileOpenListeners, message.payload);
        return;
      }
      if (message.type === "file-saved") {
        emit(fileSavedListeners, message.payload.version);
        return;
      }
      if (message.type === "file-snapshot") {
        const answer = (payload) => {
          if (!disposed)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "file-snapshot-result",
              id: message.id,
              payload
            });
        };
        const fail = (text) => answer({ error: (text.trim() || "Could not read the edited file.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        const handler = fileSnapshotHandler;
        if (!handler) {
          fail("This extension does not edit files.");
          return;
        }
        Promise.resolve().then(() => handler(message.payload.purpose)).then((snapshot) => {
          if (fileEditorPayloadSize(snapshot) > GUEST_FILE_EDITOR_CONTENT_MAX) {
            fail(`The file is over ${GUEST_FILE_EDITOR_CONTENT_MAX} ${"bytes" in snapshot ? "bytes" : "characters"}.`);
            return;
          }
          if (snapshot.version.length > GUEST_FILE_EDITOR_VERSION_MAX) {
            fail(`The snapshot version is over ${GUEST_FILE_EDITOR_VERSION_MAX} characters.`);
            return;
          }
          answer({ snapshot: "bytes" in snapshot ? { bytes: snapshot.bytes, version: snapshot.version } : { content: snapshot.content, version: snapshot.version } });
        }, (error) => fail(error instanceof Error ? error.message : String(error)));
        return;
      }
      if (message.type === "resolve") {
        const answer = (payload) => {
          post({
            channel: OPENCHAMBER_SDK_CHANNEL,
            v: OPENCHAMBER_SDK_API_VERSION,
            type: "resolve-result",
            id: message.id,
            payload
          });
        };
        const handler = resolveHandler;
        if (!handler) {
          answer({ error: "This extension does not resolve commands." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then((item) => answer({ item: item ? clampAttachRequest(item) : null }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ error: (text || "Command failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      const waiter = pending.get(message.id);
      if (!waiter)
        return;
      clearTimeout(waiter.timer);
      pending.delete(message.id);
      if (message.ok) {
        waiter.resolve(message.payload);
        return;
      }
      waiter.reject(new HostRequestError(message.code, message.error));
    };
    target.addEventListener("message", onMessage);
    post({
      channel: OPENCHAMBER_SDK_CHANNEL,
      v: OPENCHAMBER_SDK_API_VERSION,
      type: "hello"
    });
    const send = (message, timeoutMs = requestTimeoutMs) => {
      if (disposed || target.parent === target) {
        return Promise.reject(new HostRequestError("HOST_UNAVAILABLE", "No host frame. This page is not in an iframe."));
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(message.id);
          reject(new HostRequestError("HOST_TIMEOUT", "Host did not answer in time."));
        }, timeoutMs);
        pending.set(message.id, { resolve, reject, timer });
        post(message);
      });
    };
    const request = (message) => send(message).then(() => void 0);
    const envelope = { channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION };
    const notify = (message) => {
      if (!disposed && target.parent !== target)
        post(message);
    };
    const requestFileSave = () => notify({ ...envelope, type: "file-save" });
    const onSaveShortcut = (event) => {
      if (!isKeyEvent(event) || !isSaveShortcut(event))
        return;
      event.preventDefault();
      requestFileSave();
    };
    const onPopoverEscape = (event) => {
      if (!isKeyEvent(event) || event.key !== "Escape" || lastReady?.surface !== "popover" || !lastReady.popover)
        return;
      event.preventDefault();
      void closePopover(lastReady.popover.id, "escape").catch(() => void 0);
    };
    const reportPopoverActivity = () => {
      const popover = lastReady?.surface === "popover" ? lastReady.popover : void 0;
      if (!popover)
        return;
      const active2 = popoverPointerActive || popoverFocusActive;
      if (popoverActivityReported === active2)
        return;
      popoverActivityReported = active2;
      void setPopoverAnchorActive(popover.id, active2).catch(() => void 0);
    };
    const onPopoverPointerOver = () => {
      if (lastReady?.surface !== "popover" || popoverPointerActive)
        return;
      popoverPointerActive = true;
      reportPopoverActivity();
    };
    const onPopoverPointerOut = (event) => {
      if (lastReady?.surface !== "popover" || event.relatedTarget !== null || !popoverPointerActive)
        return;
      popoverPointerActive = false;
      reportPopoverActivity();
    };
    const onPopoverFocus = () => {
      if (lastReady?.surface !== "popover" || popoverFocusActive)
        return;
      popoverFocusActive = true;
      reportPopoverActivity();
    };
    const onPopoverBlur = () => {
      if (lastReady?.surface !== "popover" || !popoverFocusActive)
        return;
      popoverFocusActive = false;
      reportPopoverActivity();
    };
    const requireIdentity = (value, maximum = 1024) => {
      if (!value.trim() || value.length > maximum)
        throw new HostRequestError("HOST_REJECTED", `Identity must contain 1 to ${maximum} characters.`);
    };
    const readWorkspace = async (query) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const result = await send({ ...envelope, type: "workspace-read", id: nextId(ids), payload: query });
      if (!result || !("kind" in result) || !("state" in result) || result.kind !== query.kind) {
        throw new HostRequestError("HOST_REJECTED", "Host did not return workspace data.");
      }
      return result;
    };
    const subscribeWorkspace = async (query, listener) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const subscriptionId = nextId(ids);
      workspaceListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "workspace-subscribe", id: nextId(ids), payload: { subscriptionId, query } });
      } catch (error) {
        workspaceListeners.delete(subscriptionId);
        if (!disposed)
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!workspaceListeners.delete(subscriptionId) || disposed)
          return;
        post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const subscribeShells = async (scope, listener) => {
      if (scope.kind === "session")
        requireIdentity(scope.sessionId);
      if (scope.kind === "project")
        requireIdentity(scope.projectId);
      const subscriptionId = nextId(ids);
      shellsListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "shells-subscribe", id: nextId(ids), payload: { subscriptionId, scope } });
      } catch (error) {
        shellsListeners.delete(subscriptionId);
        if (!disposed)
          post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!shellsListeners.delete(subscriptionId) || disposed)
          return;
        post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const storage = async (payload) => {
      if ("key" in payload && (payload.key.length === 0 || payload.key.length > GUEST_STORAGE_KEY_MAX)) {
        throw new HostRequestError("HOST_REJECTED", "Storage key must contain 1 to 128 characters.");
      }
      if (payload.op === "set" && !isJsonValue(payload.value)) {
        throw new HostRequestError("HOST_REJECTED", "Storage values must be JSON.");
      }
      if (payload.op === "set" && new TextEncoder().encode(JSON.stringify(payload.value)).length > GUEST_STORAGE_VALUE_BYTES) {
        throw new HostRequestError("HOST_REJECTED", "Storage value exceeds 64 KiB.");
      }
      if (payload.scope === "device" && lastReady?.features?.deviceStorage !== true) {
        throw new HostRequestError("UNSUPPORTED", "This host does not support device storage.");
      }
      const result = await send({ ...envelope, type: "storage", id: nextId(ids), payload });
      if (!result || !("storage" in result) || result.op !== payload.op)
        throw new HostRequestError("HOST_REJECTED", "Host did not return storage data.");
      return result;
    };
    const closePopover = (id, reason) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({ ...envelope, type: "popover-close", id: nextId(ids), payload: reason ? { id, reason } : { id } });
    const setPopoverAnchorActive = (id, active2) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({ ...envelope, type: "popover-anchor", id: nextId(ids), payload: { id, active: active2 } });
    target.addEventListener("keydown", onPopoverEscape, true);
    target.addEventListener("pointerover", onPopoverPointerOver);
    target.addEventListener("pointermove", onPopoverPointerOver);
    target.addEventListener("pointerout", onPopoverPointerOut);
    target.addEventListener("focus", onPopoverFocus);
    target.addEventListener("blur", onPopoverBlur);
    return {
      onAction: (handler) => {
        actionHandler = handler;
        return () => {
          if (actionHandler === handler)
            actionHandler = null;
        };
      },
      listProjects: async () => {
        const result = await readWorkspace({ kind: "projects" });
        if (result.kind !== "projects")
          throw new HostRequestError("HOST_REJECTED", "Expected projects.");
        return result;
      },
      listWorktrees: async (projectId) => {
        const result = await readWorkspace({ kind: "worktrees", projectId });
        if (result.kind !== "worktrees")
          throw new HostRequestError("HOST_REJECTED", "Expected worktrees.");
        return result;
      },
      listSessions: async (projectId) => {
        const result = await readWorkspace({ kind: "sessions", projectId });
        if (result.kind !== "sessions")
          throw new HostRequestError("HOST_REJECTED", "Expected sessions.");
        return result;
      },
      onProjects: (listener) => subscribeWorkspace({ kind: "projects" }, (snapshot) => {
        if (snapshot.kind === "projects")
          listener(snapshot);
      }),
      onWorktrees: (projectId, listener) => subscribeWorkspace({ kind: "worktrees", projectId }, (snapshot) => {
        if (snapshot.kind === "worktrees")
          listener(snapshot);
      }),
      onSessions: (projectId, listener) => subscribeWorkspace({ kind: "sessions", projectId }, (snapshot) => {
        if (snapshot.kind === "sessions")
          listener(snapshot);
      }),
      onRunningShells: (scope, listener) => subscribeShells(scope, listener),
      readShellOutput: async (shellId, options2) => {
        requireIdentity(shellId, GUEST_SHELL_ID_MAX);
        const cursor = options2?.cursor;
        if (cursor !== void 0 && (!Number.isInteger(cursor) || cursor < 0)) {
          throw new HostRequestError("HOST_REJECTED", "Shell output cursor must be a non-negative integer.");
        }
        const tailBytes = options2?.tailBytes;
        if (tailBytes !== void 0 && (!Number.isInteger(tailBytes) || tailBytes < 1 || tailBytes > GUEST_SHELL_OUTPUT_TAIL_MAX)) {
          throw new HostRequestError("HOST_REJECTED", `Shell output tailBytes must be an integer between 1 and ${GUEST_SHELL_OUTPUT_TAIL_MAX}.`);
        }
        const result = await send({ ...envelope, type: "shell-output", id: nextId(ids), payload: { shellId, cursor, tailBytes } });
        const output = result;
        if (!output || typeof output.output !== "string" || !Number.isFinite(output.cursor)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return shell output.");
        }
        return output;
      },
      stopShell: async (shellId) => {
        requireIdentity(shellId, GUEST_SHELL_ID_MAX);
        const result = await send({ ...envelope, type: "shell-stop", id: nextId(ids), payload: { shellId } });
        if (result?.stopped !== true)
          throw new HostRequestError("HOST_REJECTED", "Host did not stop the shell.");
        return { stopped: true };
      },
      openSession: async (sessionId) => {
        requireIdentity(sessionId);
        await request({ ...envelope, type: "open-session", id: nextId(ids), payload: { sessionId } });
      },
      storage: {
        get: async (key, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "get", key };
          if (scope)
            payload.scope = scope;
          const result = await storage(payload);
          return result.op === "get" && result.found ? result.value : void 0;
        },
        set: async (key, value, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "set", key, value };
          if (scope)
            payload.scope = scope;
          await storage(payload);
        },
        delete: async (key, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "delete", key };
          if (scope)
            payload.scope = scope;
          await storage(payload);
        },
        keys: async (options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "keys" };
          if (scope)
            payload.scope = scope;
          const result = await storage(payload);
          if (result.op !== "keys")
            throw new HostRequestError("HOST_REJECTED", "Expected storage keys.");
          return result.keys;
        }
      },
      onReady: (listener) => {
        readyListeners.add(listener);
        if (lastReady)
          listener(lastReady);
        return () => {
          readyListeners.delete(listener);
        };
      },
      onDirectory: (listener) => {
        directoryListeners.add(listener);
        if (lastReady)
          listener(lastReady.directory);
        return () => {
          directoryListeners.delete(listener);
        };
      },
      onSession: (listener) => {
        sessionListeners.add(listener);
        if (lastReady)
          listener(lastReady.session);
        return () => {
          sessionListeners.delete(listener);
        };
      },
      onSessionLifecycle: (listener) => {
        lifecycleListeners.add(listener);
        if (lastLifecycle)
          listener(lastLifecycle);
        return () => {
          lifecycleListeners.delete(listener);
        };
      },
      onConnection: (listener) => {
        connectionListeners.add(listener);
        if (lastReady)
          listener(lastReady.connection);
        return () => {
          connectionListeners.delete(listener);
        };
      },
      onSettings: (listener) => {
        settingsListeners.add(listener);
        if (lastReady)
          listener(lastReady.settings);
        return () => {
          settingsListeners.delete(listener);
        };
      },
      onItem: (listener) => {
        itemListeners.add(listener);
        if (lastReady)
          listener(lastReady.item);
        return () => {
          itemListeners.delete(listener);
        };
      },
      onStatusControl: (listener) => {
        statusControlListeners.add(listener);
        return () => {
          statusControlListeners.delete(listener);
        };
      },
      onPopoverClosed: (listener) => {
        popoverClosedListeners.add(listener);
        return () => {
          popoverClosedListeners.delete(listener);
        };
      },
      setStatusControls: (controls) => {
        if (lastReady?.features?.statusControls !== true) {
          return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support status controls."));
        }
        if (!isGuestStatusControls(controls)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "Status controls must have unique bounded ids and valid selected options."));
        }
        return request({ ...envelope, type: "status-controls", id: nextId(ids), payload: { controls } });
      },
      openPopover: (payload) => {
        if (lastReady?.features?.popovers !== true) {
          return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers."));
        }
        if (!isGuestPopoverRequest(payload)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "Popover requests need bounded geometry and JSON data."));
        }
        return request({ ...envelope, type: "popover-open", id: nextId(ids), payload });
      },
      closePopover,
      setPopoverAnchorActive,
      onResolve: (handler) => {
        resolveHandler = handler;
        return () => {
          if (resolveHandler === handler)
            resolveHandler = null;
        };
      },
      toast: (payload) => {
        const message = payload.message.trim();
        if (!message || message.length > GUEST_TOAST_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast message must contain 1 to ${GUEST_TOAST_MAX} characters.`));
        }
        if (payload.copy && payload.copy !== true && (!payload.copy.text.length || payload.copy.text.length > GUEST_CLIPBOARD_TEXT_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast copy text must contain 1 to ${GUEST_CLIPBOARD_TEXT_MAX} characters.`));
        }
        return request({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "toast",
          id: nextId(ids),
          payload: { ...payload, message }
        });
      },
      openUrl: (url) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-url",
        id: nextId(ids),
        payload: { url }
      }),
      openCommit: (sha) => isGuestCommitSha(sha) ? request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-commit",
        id: nextId(ids),
        payload: { sha }
      }) : Promise.reject(new HostRequestError("HOST_REJECTED", "Commit id must be 7 to 64 hex characters.")),
      openSurface: (surfaceId) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-surface",
        id: nextId(ids),
        payload: { surfaceId }
      }),
      writeClipboard: (text) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "clipboard-write",
        id: nextId(ids),
        payload: { text }
      }),
      compose: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "compose",
        id: nextId(ids),
        payload
      }),
      attach: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "attach",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      startSession: async (payload) => {
        if (payload.projectId !== void 0)
          requireIdentity(payload.projectId);
        const worktree = payload.worktree;
        if (worktree && worktree !== true) {
          if (worktree.kind === "existing")
            requireIdentity(worktree.directory);
          else {
            if (worktree.name !== void 0)
              requireIdentity(worktree.name, 200);
            if (worktree.baseBranch !== void 0)
              requireIdentity(worktree.baseBranch, 200);
          }
        }
        const result = await send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "start-session",
          id: nextId(ids),
          payload: clampStartSessionRequest(payload)
        }, options.requestTimeoutMs ?? 18e4);
        if (!isStartSessionResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a session.");
        }
        return result;
      },
      prompt: (payload) => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "prompt",
        id: nextId(ids),
        payload: clampPromptRequest(payload)
      }).then((result) => {
        if (!isPromptResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a prompt result.");
        }
        return result;
      }),
      sessionLink: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "session-link",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      close: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "close",
        id: nextId(ids)
      }),
      oauthStart: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-start",
        id: nextId(ids)
      }),
      oauthDisconnect: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-disconnect",
        id: nextId(ids)
      }),
      request: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host request result was empty.");
        }
        return result;
      }),
      serviceRequest: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host service request result was empty.");
        }
        return result;
      }),
      serviceStatus: () => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-status",
        id: nextId(ids)
      }).then((result) => {
        if (!isServiceStatusResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return service status.");
        }
        return result;
      }),
      readFile: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-read",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileReadResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file content.");
        }
        return result;
      }),
      writeFile: (path, content) => {
        if (!isGuestFilePath(path)) {
          return rejectBadFilePath();
        }
        if (content.length > GUEST_FILE_CONTENT_MAX) {
          return Promise.reject(new HostRequestError("FILE_TOO_LARGE", `Content is over ${GUEST_FILE_CONTENT_MAX} characters.`));
        }
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "file-write",
          id: nextId(ids),
          payload: { path, content }
        }).then((result) => {
          if (!isFileWriteResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not confirm the write.");
          }
          return result;
        });
      },
      listDir: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-list",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileListResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return directory entries.");
        }
        return result;
      }),
      stat: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-stat",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileStatResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file status.");
        }
        return result;
      }),
      generate: (input) => {
        const prompt = input.prompt.trim();
        const system = input.system?.trim();
        if (prompt.length === 0 || prompt.length > GUEST_GENERATE_PROMPT_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Prompt must be 1 to ${GUEST_GENERATE_PROMPT_MAX} characters.`));
        }
        if (system !== void 0 && (system.length === 0 || system.length > GUEST_GENERATE_SYSTEM_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `System prompt must be 1 to ${GUEST_GENERATE_SYSTEM_MAX} characters.`));
        }
        const maxOutputTokens = input.maxOutputTokens === void 0 ? void 0 : Math.min(GUEST_GENERATE_OUTPUT_TOKENS_MAX, Math.max(1, Math.floor(input.maxOutputTokens)));
        if (maxOutputTokens !== void 0 && !Number.isFinite(maxOutputTokens)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "maxOutputTokens must be a number."));
        }
        const payload = { prompt };
        if (system !== void 0)
          payload.system = system;
        if (maxOutputTokens !== void 0)
          payload.maxOutputTokens = maxOutputTokens;
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "generate",
          id: nextId(ids),
          payload
        }, options.requestTimeoutMs ?? GUEST_GENERATE_TIMEOUT_MS).then((result) => {
          if (!isGenerateResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not return generated text.");
          }
          return result;
        });
      },
      setBadge: (count) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "badge",
        id: nextId(ids),
        payload: { count: clampBadgeCount(count) }
      }),
      setHeight: (height) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "resize",
        id: nextId(ids),
        payload: { height: clampFrameHeight(height) }
      }),
      onFileOpen: (listener) => {
        fileOpenListeners.add(listener);
        if (!saveShortcutInstalled) {
          saveShortcutInstalled = true;
          target.addEventListener("keydown", onSaveShortcut, true);
        }
        if (lastFile)
          listener(lastFile);
        return () => {
          fileOpenListeners.delete(listener);
        };
      },
      onFileSnapshot: (handler) => {
        fileSnapshotHandler = handler;
        return () => {
          if (fileSnapshotHandler === handler)
            fileSnapshotHandler = null;
        };
      },
      onFileSaved: (listener) => {
        fileSavedListeners.add(listener);
        return () => {
          fileSavedListeners.delete(listener);
        };
      },
      reportFileChange: (change) => notify({ ...envelope, type: "file-change", payload: { dirty: change.dirty, edited: change.edited } }),
      requestFileSave,
      reportFileUnsupported: () => notify({ ...envelope, type: "file-unsupported" }),
      dispose: () => {
        for (const subscriptionId of workspaceListeners.keys()) {
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        workspaceListeners.clear();
        for (const subscriptionId of shellsListeners.keys()) {
          post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        shellsListeners.clear();
        disposed = true;
        resolveHandler = null;
        actionHandler = null;
        fileSnapshotHandler = null;
        fileOpenListeners.clear();
        fileSavedListeners.clear();
        if (saveShortcutInstalled)
          target.removeEventListener("keydown", onSaveShortcut, true);
        target.removeEventListener("message", onMessage);
        target.removeEventListener("keydown", onPopoverEscape, true);
        target.removeEventListener("pointerover", onPopoverPointerOver);
        target.removeEventListener("pointermove", onPopoverPointerOver);
        target.removeEventListener("pointerout", onPopoverPointerOut);
        target.removeEventListener("focus", onPopoverFocus);
        target.removeEventListener("blur", onPopoverBlur);
        for (const waiter of pending.values()) {
          clearTimeout(waiter.timer);
          waiter.reject(new HostRequestError("HOST_UNAVAILABLE", "Host client was disposed."));
        }
        pending.clear();
        readyListeners.clear();
        directoryListeners.clear();
        sessionListeners.clear();
        lifecycleListeners.clear();
        connectionListeners.clear();
        settingsListeners.clear();
        itemListeners.clear();
        statusControlListeners.clear();
        popoverClosedListeners.clear();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/service-providers.js
  var BROWSER_CONTROL_ACTIONS = [
    "browser.open",
    "browser.snapshot",
    "browser.click",
    "browser.type",
    "browser.scroll",
    "browser.back",
    "browser.forward",
    "browser.inspect",
    "browser.capture",
    "browser.resize"
  ];
  var BROWSER_PROVIDER_IDLE_MS = 10 * 6e4;
  var CONTROL_ACTIONS = new Set(BROWSER_CONTROL_ACTIONS);

  // node_modules/@openchamber/sdk/dist/service-surface.js
  var SURFACE_CONTROLLERS = ["none", "agent", "user"];
  var CONTROLLERS = new Set(SURFACE_CONTROLLERS);

  // node_modules/@openchamber/sdk/dist/ui/theme.js
  var TOKEN_VARS = [
    ["--oc-bg", "background"],
    ["--oc-elevated", "elevated"],
    ["--oc-fg", "foreground"],
    ["--oc-muted", "muted"],
    ["--oc-subtle", "subtle"],
    ["--oc-border", "border"],
    ["--oc-hover", "hover"],
    ["--oc-selection", "selection"],
    ["--oc-focus", "focus"],
    ["--oc-primary", "primary"],
    ["--oc-muted-surface", "mutedSurface"],
    ["--oc-elevated-fg", "elevatedForeground"],
    ["--oc-active", "active"],
    ["--oc-selection-fg", "selectionForeground"],
    ["--oc-primary-fg", "primaryForeground"],
    ["--oc-primary-text", "primaryText"],
    ["--oc-success-text", "successText"],
    ["--oc-warning-text", "warningText"],
    ["--oc-error-text", "errorText"],
    ["--oc-info-text", "infoText"],
    ["--oc-success", "success"],
    ["--oc-warning", "warning"],
    ["--oc-error", "error"],
    ["--oc-info", "info"],
    ["--oc-font", "font"],
    ["--oc-mono", "mono"],
    ["--oc-radius", "radius"],
    ["--surface-background", "background"],
    ["--surface-elevated", "elevated"],
    ["--surface-foreground", "foreground"],
    ["--surface-muted-foreground", "muted"],
    ["--surface-subtle", "subtle"],
    ["--interactive-border", "border"],
    ["--interactive-hover", "hover"],
    ["--interactive-selection", "selection"],
    ["--interactive-focus-ring", "focus"],
    ["--primary", "primary"],
    ["--surface-muted", "mutedSurface"],
    ["--surface-elevated-foreground", "elevatedForeground"],
    ["--interactive-active", "active"],
    ["--interactive-selection-foreground", "selectionForeground"],
    ["--primary-foreground", "primaryForeground"],
    ["--primary-text", "primaryText"],
    ["--success-text", "successText"],
    ["--warning-text", "warningText"],
    ["--error-text", "errorText"],
    ["--info-text", "infoText"],
    ["--status-success", "success"],
    ["--status-warning", "warning"],
    ["--status-error", "error"],
    ["--status-info", "info"],
    ["--font-sans", "font"],
    ["--font-mono", "mono"],
    ["--radius", "radius"]
  ];
  var SYNTAX_TOKEN_VARS = [
    ["--oc-syntax-keyword", "--syntax-keyword", "syntaxKeyword"],
    ["--oc-syntax-string", "--syntax-string", "syntaxString"],
    ["--oc-syntax-number", "--syntax-number", "syntaxNumber"],
    ["--oc-syntax-function", "--syntax-function", "syntaxFunction"],
    ["--oc-syntax-type", "--syntax-type", "syntaxType"],
    ["--oc-syntax-comment", "--syntax-comment", "syntaxComment"],
    ["--oc-syntax-variable", "--syntax-variable", "syntaxVariable"],
    ["--oc-syntax-operator", "--syntax-operator", "syntaxOperator"]
  ];
  var applyHostTheme = (theme, root2) => {
    root2.style.colorScheme = theme.mode;
    for (const [name, key] of TOKEN_VARS) {
      root2.style.setProperty(name, theme.tokens[key]);
    }
    for (const [alias, hostName, key] of SYNTAX_TOKEN_VARS) {
      const value = theme.tokens[key] ?? "";
      root2.style.setProperty(alias, value);
      root2.style.setProperty(hostName, value);
    }
    root2.style.setProperty("font-family", theme.tokens.font);
    root2.style.setProperty("font-size", "0.875rem");
    root2.style.setProperty("line-height", "1.45");
    root2.style.setProperty("color", theme.tokens.foreground);
  };
  var applyHostReady = (ctx, root2) => {
    applyHostTheme(ctx.theme, root2);
    if (root2.dataset) {
      root2.dataset.ocSurface = ctx.surface;
      root2.dataset.ocTheme = ctx.theme.mode;
    }
  };

  // node_modules/@openchamber/sdk/dist/ui/dom.js
  var STYLE_ID = "oc-sdk-ui-style";
  var clearNode = (node) => {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  };
  var ensureStyle = (css) => {
    const existing = document.getElementById(STYLE_ID);
    if (existing instanceof HTMLStyleElement) {
      if (existing.textContent !== css) {
        existing.textContent = css;
      }
      return;
    }
    installGuestScrollbarActivity(document);
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  };
  var el = (tag, className) => {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    return node;
  };
  var button = (className) => {
    const node = el("button", className);
    node.type = "button";
    return node;
  };
  var setText = (node, text) => {
    const next = text ?? "";
    if (node.textContent !== next) {
      node.textContent = next;
    }
  };
  var setAttr = (node, name, value) => {
    if (value === void 0 || value === null || value === "") {
      node.removeAttribute(name);
    } else if (node.getAttribute(name) !== value) {
      node.setAttribute(name, value);
    }
  };

  // node_modules/@openchamber/sdk/dist/ui/style.js
  var OC_ALIAS = {
    "surface-background": "bg",
    "surface-elevated": "elevated",
    "surface-elevated-foreground": "elevated-fg",
    "surface-foreground": "fg",
    "surface-muted-foreground": "muted",
    "surface-muted": "muted-surface",
    "surface-subtle": "subtle",
    "interactive-border": "border",
    "interactive-hover": "hover",
    "interactive-active": "active",
    "interactive-selection": "selection",
    "interactive-selection-foreground": "selection-fg",
    "interactive-focus-ring": "focus",
    "primary": "primary",
    "primary-foreground": "primary-fg",
    "primary-text": "primary-text",
    "success-text": "success-text",
    "warning-text": "warning-text",
    "error-text": "error-text",
    "info-text": "info-text",
    "status-success": "success",
    "status-warning": "warning",
    "status-error": "error",
    "status-info": "info",
    "font-sans": "font",
    "font-mono": "mono",
    "radius": "radius"
  };
  var v = (name, fallback) => `var(--${name}, var(--oc-${OC_ALIAS[name]}, ${fallback}))`;
  var bg = v("surface-background", "transparent");
  var elevated = v("surface-elevated", "transparent");
  var elevatedFg = v("surface-elevated-foreground", "inherit");
  var fg = v("surface-foreground", "inherit");
  var muted = v("surface-muted-foreground", "gray");
  var secondary = v("surface-muted", "transparent");
  var border = v("interactive-border", "currentColor");
  var hover = v("interactive-hover", "transparent");
  var active = v("interactive-active", "transparent");
  var selection = v("interactive-selection", "transparent");
  var selectionFg = v("interactive-selection-foreground", "inherit");
  var focus = v("interactive-focus-ring", "currentColor");
  var primary = v("primary", "currentColor");
  var primaryText = v("primary-text", "inherit");
  var errorText = v("error-text", "inherit");
  var font = v("font-sans", "inherit");
  var mono = v("font-mono", "monospace");
  var radius = v("radius", "9px");
  var mix = (color, pct, base = "transparent") => `color-mix(in srgb, ${color} ${pct}%, ${base})`;
  var focusRing = `box-shadow: 0 0 0 2px ${focus};`;
  var tone = (name) => {
    const color = v(`status-${name}`, "currentColor");
    return `
.oc-sdk[data-tone="${name}"], .oc-sdk [data-tone="${name}"] { --oc-sdk-tone: ${color}; --oc-sdk-tone-text: ${v(`${name}-text`, "inherit")}; }`;
  };
  var UI_CSS = `
${GUEST_SCROLLBAR_CSS}
.oc-sdk { box-sizing: border-box; color: ${fg}; font-family: ${font}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${focusRing} }
.oc-sdk-mono { font-family: ${mono}; }
.oc-sdk-muted { color: ${muted}; }
${tone("success")}${tone("warning")}${tone("error")}${tone("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${primary}; --oc-sdk-tone-text: ${primaryText}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${radius}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${primaryText}; background: ${mix(primary, 10, bg)}; border-color: ${mix(primary, 12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${mix(primary, 16, bg)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${mix(primary, 22, bg)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${secondary}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="outline"] { background: ${elevated}; color: ${elevatedFg}; border-color: ${border}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${hover}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${active}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${v("status-error", "red")}; color: ${errorText}; background: ${mix("var(--oc-sdk-tone)", 7, bg)}; border-color: ${mix("var(--oc-sdk-tone)", 12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${mix("var(--oc-sdk-tone)", 9, bg)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${mix("var(--oc-sdk-tone)", 11, bg)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${muted}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${errorText}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${radius}; background: ${elevated}; color: ${elevatedFg}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${mix(border, 60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${muted}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${focus}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${v("status-error", "red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${v("status-error", "red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${mono}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${muted}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${primary}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${muted}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${hover}; color: ${fg}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${border}; border-radius: 6px; background: ${elevated}; color: ${elevatedFg}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${muted}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${muted}; }
.oc-sdk-popup { --surface-foreground: ${elevatedFg}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${mix(border, 60)}; border-radius: 12px; background: ${elevated}; color: ${elevatedFg}; box-shadow: 0 8px 24px ${mix(fg, 12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${hover}; }
.oc-sdk-option[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-option[data-destructive="true"] { color: ${errorText}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${mix(v("status-error", "red"), 10)}; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-option-check { flex: 0 0 auto; width: 12px; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; color: ${muted}; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid ${border}; border-radius: 4px; color: ${primary}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${mix(primary, 65, border)}; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; border-radius: 9999px; background: ${border}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${bg}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${primary}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${focusRing} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${muted}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${mix(fg, 4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${muted}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${fg}; }
.oc-sdk-tab[aria-selected="true"] { color: ${selectionFg}; background: ${selection}; border-color: ${border}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${muted}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${hover}; color: ${muted}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${mix("var(--oc-sdk-tone)", 15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${hover}; }
.oc-sdk-row[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${mono}; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${muted}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; color: ${muted}; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid ${border}; border-top-color: ${primary}; border-radius: 9999px; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid ${mix("var(--oc-sdk-tone)", 40)}; border-radius: 8px; background: ${mix("var(--oc-sdk-tone)", 10)}; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { font-size: 0.8125rem; color: ${muted}; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; color: ${muted}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; background: ${mix(border, 40)}; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${muted}; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; border-radius: 9999px; background: ${border}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; border-radius: 9999px; background: var(--oc-sdk-tone, ${primary}); transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text a { color: ${primaryText}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${mix(border, 60)}; }
`;

  // node_modules/@openchamber/sdk/dist/ui/button.js
  var ring = () => {
    const spinner = document.createElement("span");
    spinner.className = "oc-sdk-spinner-ring";
    spinner.setAttribute("aria-hidden", "true");
    return spinner;
  };
  var mountButton = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const node = button("oc-sdk oc-sdk-btn");
    const spinner = ring();
    const label = document.createElement("span");
    node.append(label);
    root2.append(node);
    const paint = () => {
      node.dataset.variant = props.variant ?? "default";
      node.dataset.size = props.size ?? "default";
      node.disabled = Boolean(props.disabled) || Boolean(props.loading);
      node.dataset.loading = props.loading ? "true" : "false";
      node.setAttribute("aria-busy", props.loading ? "true" : "false");
      if (props.loading && spinner.parentNode !== node) {
        node.prepend(spinner);
      } else if (!props.loading && spinner.parentNode === node) {
        spinner.remove();
      }
      setText(label, props.label);
    };
    const onClick = () => {
      if (props.disabled || props.loading) {
        return;
      }
      props.onClick();
    };
    node.addEventListener("click", onClick);
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        node.removeEventListener("click", onClick);
        node.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/navigation.js
  var navigationKey = (event, axis = "vertical") => {
    const [next, previous] = axis === "vertical" ? ["ArrowDown", "ArrowUp"] : ["ArrowRight", "ArrowLeft"];
    if (event.key === next || event.ctrlKey && event.key.toLowerCase() === "n")
      return "next";
    if (event.key === previous || event.ctrlKey && event.key.toLowerCase() === "p")
      return "previous";
    if (event.key === "Home")
      return "first";
    if (event.key === "End")
      return "last";
    return null;
  };
  var moveListSelection = (items, currentId, key) => {
    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) {
      return null;
    }
    const first = enabled[0];
    const last = enabled[enabled.length - 1];
    if (key === "first" || !first || !last) {
      return first?.id ?? null;
    }
    if (key === "last") {
      return last.id;
    }
    const index = enabled.findIndex((item) => item.id === currentId);
    if (index === -1) {
      return key === "next" ? first.id : last.id;
    }
    const target = enabled[Math.min(enabled.length - 1, Math.max(0, index + (key === "next" ? 1 : -1)))];
    return target?.id ?? null;
  };

  // node_modules/@openchamber/sdk/dist/ui/badge.js
  var applyTone = (node, tone2) => {
    setAttr(node, "data-tone", tone2 && tone2 !== "neutral" ? tone2 : null);
  };

  // node_modules/@openchamber/sdk/dist/ui/list.js
  var listCount = 0;
  var mountList = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const uid = `oc-sdk-list-${listCount += 1}`;
    const list = el("div", "oc-sdk oc-sdk-list");
    list.setAttribute("role", "listbox");
    list.tabIndex = 0;
    root2.append(list);
    let activeId = null;
    const rowId = (id) => `${uid}-${id}`;
    const setActive = (id) => {
      activeId = id;
      for (const row of Array.from(list.children)) {
        if (row instanceof HTMLElement) {
          row.dataset.active = row.id === rowId(id ?? "") ? "true" : "false";
        }
      }
      setAttr(list, "aria-activedescendant", id ? rowId(id) : null);
      list.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
    };
    const span = (className, text) => {
      const node = el("span", className);
      node.textContent = text;
      return node;
    };
    const paint = () => {
      clearNode(list);
      setAttr(list, "aria-label", props.ariaLabel);
      if (props.items.length === 0) {
        list.append(span("oc-sdk-list-empty", props.emptyText ?? "Nothing here"));
        setActive(null);
        return;
      }
      for (const item of props.items) {
        const row = button("oc-sdk-row");
        row.id = rowId(item.id);
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", item.id === props.selectedId ? "true" : "false");
        row.disabled = Boolean(item.disabled);
        row.tabIndex = -1;
        if (item.leading)
          row.append(span("oc-sdk-row-lead", item.leading));
        const main = el("span", "oc-sdk-row-main");
        main.append(span("oc-sdk-row-title", item.title));
        if (item.subtitle)
          main.append(span("oc-sdk-row-sub", item.subtitle));
        row.append(main);
        if (item.badge) {
          const badge = span("oc-sdk-badge", item.badge.label);
          applyTone(badge, item.badge.tone);
          row.append(badge);
        }
        if (item.meta)
          row.append(span("oc-sdk-row-meta", item.meta));
        row.addEventListener("click", () => props.onSelect(item.id));
        list.append(row);
      }
      const stillThere = props.items.some((item) => item.id === activeId && !item.disabled);
      setActive(stillThere ? activeId : props.selectedId ?? null);
    };
    const onKeyDown = (event) => {
      const step = navigationKey(event);
      if (step) {
        event.preventDefault();
        setActive(moveListSelection(props.items, activeId, step));
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && activeId) {
        event.preventDefault();
        props.onSelect(activeId);
      }
    };
    list.addEventListener("keydown", onKeyDown);
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        list.removeEventListener("keydown", onKeyDown);
        list.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/empty.js
  var mountEmpty = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const shell = el("div", "oc-sdk oc-sdk-empty");
    const title = el("h2", "oc-sdk-empty-title");
    const body = el("p", "oc-sdk-empty-body");
    const slot = el("div", "oc-sdk-empty-action");
    shell.append(title, body, slot);
    root2.append(shell);
    let action = null;
    const paint = () => {
      setText(title, props.title);
      setText(body, props.body);
      body.hidden = !props.body;
      slot.hidden = !props.action;
      if (!props.action) {
        action?.dispose();
        action = null;
        return;
      }
      const next = { label: props.action.label, onClick: props.action.onClick };
      if (action) {
        action.update(next);
      } else {
        action = mountButton(slot, { ...next, variant: "outline", size: "sm" });
      }
    };
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        action?.dispose();
        action = null;
        shell.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/spinner.js
  var mountSpinner = (root2, initial = {}) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const node = el("span", "oc-sdk oc-sdk-spinner");
    node.setAttribute("role", "status");
    const ring2 = el("span", "oc-sdk-spinner-ring");
    ring2.setAttribute("aria-hidden", "true");
    const label = el("span");
    node.append(ring2, label);
    root2.append(node);
    const paint = () => {
      node.dataset.size = props.size ?? "default";
      setText(label, props.label);
      label.hidden = !props.label;
      node.setAttribute("aria-label", props.label ?? "Loading");
    };
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        node.remove();
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/ui/banner.js
  var mountBanner = (root2, initial) => {
    ensureStyle(UI_CSS);
    let props = initial;
    const node = el("div", "oc-sdk oc-sdk-banner");
    const text = el("div", "oc-sdk-banner-text");
    const title = el("div", "oc-sdk-banner-title");
    const body = el("div", "oc-sdk-banner-body");
    const slot = el("div", "oc-sdk-banner-action");
    text.append(title, body);
    node.append(text, slot);
    root2.append(node);
    let action = null;
    const paint = () => {
      node.dataset.tone = props.tone;
      node.setAttribute("role", props.tone === "error" || props.tone === "warning" ? "alert" : "status");
      setText(title, props.title);
      setText(body, props.body);
      body.hidden = !props.body;
      slot.hidden = !props.action;
      if (!props.action) {
        action?.dispose();
        action = null;
        return;
      }
      const next = { label: props.action.label, onClick: props.action.onClick };
      if (action) {
        action.update(next);
      } else {
        action = mountButton(slot, { ...next, variant: "outline", size: "xs" });
      }
    };
    paint();
    return {
      update: (next) => {
        props = { ...props, ...next };
        paint();
      },
      dispose: () => {
        action?.dispose();
        action = null;
        node.remove();
      }
    };
  };

  // skill/visuals/scripts/assemble-core.mjs
  var LIB_ORDER = ["d3", "chart", "three", "katex", "mermaid"];
  var LIB_FILE = { d3: "d3.min.js", chart: "chart.umd.js", three: "three.iife.js", katex: "katex.min.js", mermaid: "mermaid.min.js" };
  var CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  var escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function toBase64(bytes) {
    if (typeof Buffer !== "undefined") return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
    let bin = "";
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    return btoa(bin);
  }
  var dataUri = (bytes, mime) => `data:${mime};base64,${toBase64(bytes)}`;
  var byteLength = (s) => new TextEncoder().encode(s).length;
  var dirOf = (p) => p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "";
  function parseManifest(frag) {
    const m = frag.replace(/^﻿/, "").match(/^\s*<!--\s*visuals:\s*([\d.]+)\s+libs:\s*([^>]*?)\s*-->/i);
    const libs = m && m[2].toLowerCase() !== "none" ? m[2].toLowerCase().split(/[\s,]+/).filter((l) => LIB_FILE[l]) : [];
    return { version: m ? m[1] : null, libs: LIB_ORDER.filter((l) => libs.includes(l)) };
  }
  function titleOf(frag, fallback = "Visual") {
    return (frag.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || fallback).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  var SHARED = /* @__PURE__ */ new Set([2385, 2386, 2404, 2405, 8204, 8205, 8377, 9676]);
  function codePointsOf(text) {
    const s = /* @__PURE__ */ new Set();
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (c >= 2304 && !SHARED.has(c)) s.add(c);
    }
    return s;
  }
  function rangeHits(range, points) {
    for (const part of range.split(",")) {
      const m = part.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/);
      if (!m) continue;
      const lo = parseInt(m[1], 16), hi = m[2] ? parseInt(m[2], 16) : lo;
      for (const p of points) if (p >= lo && p <= hi) return true;
    }
    return false;
  }
  function inlineCss(io, fragment) {
    const points = codePointsOf(fragment);
    return io.text("visuals.css").replace(/@font-face\{[^}]*\}/g, (block) => {
      const url = block.match(/url\(([^)]+)\)/)?.[1].replace(/["']/g, "");
      if (!url) return block;
      const range = block.match(/unicode-range:([^;}]+)/)?.[1];
      if (range && /font-family:"Indic"/.test(block) && !rangeHits(range, points)) return "";
      return block.replace(/url\(([^)]+)\)/, `url(${dataUri(io.bytes(url), "font/woff2")})`);
    });
  }
  function inlineKatexCss(io) {
    const dir = dirOf("vendor/katex.min.css");
    return io.text("vendor/katex.min.css").replace(/url\(([^)]+)\)/g, (m, u) => `url(${dataUri(io.bytes(dir + u.replace(/["']/g, "")), "font/woff2")})`);
  }
  function safeScript(src) {
    let s = src.replace(/<\/script/gi, "<\\/script");
    if (/<script/i.test(s)) s = s.replace(/<!--/g, "<\\!--");
    return s;
  }
  function buildStandalone(fragment, io, opts = {}) {
    const theme = opts.theme === "light" || opts.theme === "dark" ? opts.theme : null;
    const frag = fragment.replace(/^﻿/, "");
    const { libs, version } = parseManifest(frag);
    const title = titleOf(frag, opts.title);
    const gen = JSON.parse(io.text("VERSIONS.json")).visuals;
    const parts = [];
    parts.push(`<!doctype html>
<html lang="${escHtml(opts.lang || "en")}"${theme ? ` data-theme="${theme}"` : ""}>
<head>
<meta charset="utf-8">`);
    parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
    parts.push(`<meta name="color-scheme" content="${theme || "light dark"}">`);
    parts.push(`<meta name="generator" content="visuals ${gen}${version ? ` (fragment ${escHtml(version)})` : ""}">`);
    parts.push(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`);
    parts.push(`<title>${escHtml(title)}</title>`);
    parts.push(`<style>
${inlineCss(io, frag)}
</style>`);
    if (libs.includes("katex")) parts.push(`<style>
${inlineKatexCss(io)}
</style>`);
    for (const l of libs) parts.push(`<script>
${safeScript(io.text("vendor/" + LIB_FILE[l]))}
<\/script>`);
    parts.push(`<script>
${safeScript(io.text("visuals-theme.js"))}
<\/script>`);
    parts.push(`<script>Visuals.auto();<\/script>
</head>
<body>
<main>
${frag}
</main>
</body>
</html>
`);
    const html = parts.join("\n");
    return { html, bytes: byteLength(html), libs, title };
  }

  // src/asset-paths.mjs
  var TEXT_FILES = ["visuals.css", "visuals-theme.js", "VERSIONS.json"];
  function textAssetsFor(fragment) {
    const { libs } = parseManifest(fragment);
    const files = [...TEXT_FILES, ...libs.map((lib) => `vendor/${LIB_FILE[lib]}`)];
    if (libs.includes("katex")) files.push("vendor/katex.min.css");
    return files;
  }

  // src/assets.ts
  var ASSET_ROOT = "skill/visuals/assets/";
  var FONTS_PAYLOAD = "fonts.gen.json";
  var SERVICE_PATH = "/assets";
  var SERVICE_CHUNK = 15e4;
  var FETCH_ATTEMPTS = 2;
  function urlToken() {
    try {
      return new URL(window.location.href).searchParams.get("oc_url_token");
    } catch {
      return null;
    }
  }
  function assetUrl(relative) {
    const url = new URL(`../${ASSET_ROOT}${relative}`, document.baseURI);
    const token = urlToken();
    if (token) url.searchParams.set("oc_url_token", token);
    return url.toString();
  }
  function decodeBase64(encoded) {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function decodeChunks(chunks) {
    let size = 0;
    for (const chunk of chunks) size += chunk.length;
    const joined = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(joined);
  }
  async function fetchText(relative) {
    const response = await fetch(assetUrl(relative));
    if (!response.ok) throw new Error(`${relative} answered ${response.status}`);
    return response.text();
  }
  function createAssets(host) {
    const textCache = /* @__PURE__ */ new Map();
    let fonts = null;
    let serviceUsable = true;
    async function readViaService(relative) {
      const chunks = [];
      let offset = 0;
      let total = Number.POSITIVE_INFINITY;
      while (offset < total) {
        const response = await host.serviceRequest({
          method: "GET",
          path: SERVICE_PATH,
          query: { path: `${ASSET_ROOT}${relative}`, offset: String(offset), length: String(SERVICE_CHUNK) }
        });
        if (response.status !== 200) throw new Error(`${relative}: service answered ${response.status}`);
        const payload = JSON.parse(response.body);
        if (typeof payload.data !== "string" || typeof payload.length !== "number" || typeof payload.total !== "number") {
          throw new Error(`${relative}: service answered an unexpected shape`);
        }
        chunks.push(decodeBase64(payload.data));
        total = payload.total;
        if (payload.length <= 0) break;
        offset += payload.length;
      }
      return decodeChunks(chunks);
    }
    async function loadText(relative) {
      let lastError = null;
      for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
        try {
          return await fetchText(relative);
        } catch (error) {
          lastError = error;
          if (attempt + 1 < FETCH_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      if (serviceUsable) {
        try {
          return await readViaService(relative);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/NO_SERVICE|not granted|not running|failed/i.test(message)) serviceUsable = false;
          lastError = error;
        }
      }
      const detail = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(`${relative} could not be loaded (${detail})`);
    }
    async function ensureText(path) {
      const cached = textCache.get(path);
      if (cached !== void 0) return cached;
      const text = await loadText(path);
      textCache.set(path, text);
      return text;
    }
    async function ensureFonts() {
      if (fonts) return fonts;
      const payload = await ensureText(FONTS_PAYLOAD);
      const decoded = /* @__PURE__ */ new Map();
      for (const [name, base64] of Object.entries(JSON.parse(payload))) {
        decoded.set(name, decodeBase64(base64));
      }
      fonts = decoded;
      return decoded;
    }
    return {
      async preload(fragment) {
        const wanted = textAssetsFor(fragment);
        await Promise.all(wanted.map(ensureText));
        await ensureFonts();
      },
      io: {
        text(path) {
          const value = textCache.get(path);
          if (value === void 0) throw new Error(`asset not preloaded: ${path}`);
          return value;
        },
        bytes(path) {
          const value = fonts?.get(path);
          if (!value) throw new Error(`font not found: ${path}`);
          return value;
        }
      }
    };
  }

  // src/format.mjs
  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "";
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  function libsLabel(libs) {
    return libs && libs.length > 0 ? libs.join(", ") : "no libraries";
  }
  function compareVersions(left, right) {
    if (!left || !right) return left === right ? 0 : left ? 1 : -1;
    const a = String(left).split(".").map((part) => Number.parseInt(part, 10) || 0);
    const b = String(right).split(".").map((part) => Number.parseInt(part, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const diff = (a[i] ?? 0) - (b[i] ?? 0);
      if (diff !== 0) return diff > 0 ? 1 : -1;
    }
    return 0;
  }
  function dateLabel(mtime) {
    return new Intl.DateTimeFormat(void 0, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(mtime));
  }
  function hashText(text) {
    let hash = 5381;
    for (let i = 0; i < text.length; i += 1) hash = (hash << 5) + hash + text.charCodeAt(i) | 0;
    return (hash >>> 0).toString(16);
  }

  // src/render.ts
  var RenderError = class extends Error {
    code;
    constructor(code, message) {
      super(message);
      this.name = "RenderError";
      this.code = code;
    }
  };
  var MAX_FRAGMENT_CHARS = 2e5;
  var COMPOSE_MAX_CHARS = 16e3;
  var HEIGHT_MIN = 120;
  var HEIGHT_MAX = 4e3;
  function createRenderer(options) {
    const { container, host, assets } = options;
    let frame = null;
    let mode = "dark";
    let generation = 0;
    function release() {
      if (frame) {
        frame.remove();
        frame = null;
      }
    }
    function postTheme() {
      frame?.contentWindow?.postMessage({ type: "visuals:theme", value: mode }, "*");
    }
    function onMessage(event) {
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "visuals:height") {
        const height = Math.round(Number(data.value));
        if (Number.isFinite(height) && frame) {
          frame.style.height = `${Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, height))}px`;
        }
        return;
      }
      if (data.type === "visuals:ask") {
        const text = String(data.text ?? "").trim().slice(0, COMPOSE_MAX_CHARS);
        if (!text) return;
        void host.compose({ text, mode: "append" }).then(() => host.toast({ kind: "info", message: "Added to the chat box" })).catch((error) => {
          const detail = error instanceof Error ? error.message : String(error);
          void host.toast({ kind: "error", message: `Could not add to the chat box: ${detail}` });
        });
      }
    }
    window.addEventListener("message", onMessage);
    async function render(fragment) {
      const current = generation += 1;
      if (fragment.length > MAX_FRAGMENT_CHARS) {
        throw new RenderError(
          "too-large",
          `This fragment is ${fragment.length.toLocaleString()} characters; the limit is ${MAX_FRAGMENT_CHARS.toLocaleString()}.`
        );
      }
      try {
        await assets.preload(fragment);
      } catch (error) {
        throw new RenderError("assets", error instanceof Error ? error.message : String(error));
      }
      if (current !== generation) return null;
      let built;
      try {
        built = buildStandalone(fragment, assets.io, { theme: mode });
      } catch (error) {
        throw new RenderError("build", error instanceof Error ? error.message : String(error));
      }
      const scrollTop = container.scrollTop;
      release();
      const iframe = document.createElement("iframe");
      iframe.className = "visual-frame";
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.setAttribute("title", built.title || "Visual");
      iframe.style.height = `${HEIGHT_MIN}px`;
      iframe.addEventListener("load", postTheme);
      iframe.srcdoc = built.html;
      frame = iframe;
      container.append(iframe);
      container.scrollTop = scrollTop;
      let hostVersion = null;
      try {
        hostVersion = JSON.parse(assets.io.text("VERSIONS.json")).visuals ?? null;
      } catch {
        hostVersion = null;
      }
      const fragmentVersion = parseManifest(fragment).version;
      return {
        bytes: built.bytes,
        libs: built.libs,
        title: built.title,
        versionWarning: Boolean(fragmentVersion && hostVersion && compareVersions(fragmentVersion, hostVersion) > 0)
      };
    }
    return {
      render,
      setTheme(next) {
        if (next === mode) return;
        mode = next;
        postTheme();
      },
      clear: release,
      dispose() {
        window.removeEventListener("message", onMessage);
        release();
      }
    };
  }

  // src/file-surface.ts
  var OPEN_REQUEST_KEY = "open-request";
  function mountFileSurface(deps) {
    const { host, assets, root: root2 } = deps;
    const app = document.createElement("div");
    app.className = "app file-surface";
    const bar = document.createElement("div");
    bar.className = "file-bar";
    const name = document.createElement("span");
    name.className = "file-name";
    const openSlot = document.createElement("div");
    openSlot.className = "slot";
    bar.append(name, openSlot);
    const noticeHost = document.createElement("div");
    noticeHost.className = "notice";
    const viewHost = document.createElement("div");
    viewHost.className = "view-host";
    const loadingHost = document.createElement("div");
    loadingHost.className = "loading-host";
    viewHost.append(loadingHost);
    const metaHost = document.createElement("div");
    metaHost.className = "meta-host";
    app.append(bar, noticeHost, viewHost, metaHost);
    root2.append(app);
    const renderer = createRenderer({ container: viewHost, host, assets });
    let fragment = null;
    let version = "";
    let fileName = "";
    let notice = null;
    let loading = null;
    mountButton(openSlot, {
      label: "Open in panel",
      variant: "outline",
      size: "xs",
      onClick: () => {
        void (async () => {
          try {
            await host.storage.set(OPEN_REQUEST_KEY, { name: fileName, at: Date.now() });
          } catch {
          }
          try {
            await host.openSurface("plugin:smolui");
          } catch {
            toast("error", "Could not open the SmolUI panel");
          }
        })();
      }
    });
    function toast(kind, message) {
      void host.toast({ kind, message }).catch(() => {
      });
    }
    function show(tone2, title, body, action) {
      notice?.dispose();
      notice = mountBanner(noticeHost, { tone: tone2, title, body, action });
    }
    function showLoading() {
      loading?.dispose();
      loading = mountSpinner(loadingHost, { label: "Loading visual" });
    }
    async function render(content) {
      notice?.dispose();
      notice = null;
      metaHost.replaceChildren();
      showLoading();
      try {
        const info = await renderer.render(content);
        if (!info) return;
        const line = document.createElement("div");
        line.className = "meta-line";
        line.textContent = `${formatBytes(info.bytes)} \xB7 ${libsLabel(info.libs)}`;
        metaHost.append(line);
        if (info.versionWarning) {
          show(
            "warning",
            "Newer visual format",
            "This visual was written for a newer stylesheet version than this extension ships; it renders as best it can."
          );
        }
      } catch (error) {
        renderer.clear();
        if (error instanceof RenderError) {
          show(
            "error",
            error.code === "too-large" ? "Visual too large" : "Could not render this visual",
            error.message,
            { label: "Retry", onClick: () => void render(content) }
          );
        } else {
          show("error", "Could not render this visual", error instanceof Error ? error.message : String(error));
        }
      } finally {
        loading?.dispose();
        loading = null;
      }
    }
    host.onFileOpen((file) => {
      fileName = file.name;
      name.textContent = file.name;
      if (file.encoding !== "text") {
        renderer.clear();
        show("error", "Unsupported file", "This editor only opens text fragments.");
        return;
      }
      fragment = file.content;
      version = hashText(file.content);
      void render(file.content);
    });
    host.onFileSnapshot(() => ({ content: fragment ?? "", version }));
    return {
      setTheme(mode) {
        renderer.setTheme(mode);
      }
    };
  }

  // src/message-path.mjs
  var REFERENCE = /\.visuals\/([A-Za-z0-9][A-Za-z0-9._-]{0,63})\.visual\.html(?![\w.-])/g;
  function visualPathFromMessage(text) {
    if (typeof text !== "string" || text.length === 0) return null;
    let last = null;
    REFERENCE.lastIndex = 0;
    for (let match = REFERENCE.exec(text); match; match = REFERENCE.exec(text)) {
      last = match[1];
    }
    return last ? `.visuals/${last}.visual.html` : null;
  }

  // src/service-client.ts
  async function ensureSkill(host) {
    try {
      const status = await host.serviceRequest({ method: "GET", path: "/setup/status" });
      if (status.status !== 200) return "unavailable";
      const info = JSON.parse(status.body);
      if (info.installed && info.installedVersion === info.packageVersion) return "current";
      const install = await host.serviceRequest({ method: "POST", path: "/setup/install" });
      if (install.status !== 200) return "unavailable";
      return info.installed ? "updated" : "installed";
    } catch {
      return "unavailable";
    }
  }

  // src/panel.ts
  var FRAGMENT_SUFFIX = ".visual.html";
  var OPEN_REQUEST_KEY2 = "open-request";
  var OPEN_REQUEST_TTL_MS = 6e4;
  var PROMPT_HISTORY_KEY = "prompt-history";
  var PROMPT_HISTORY_MAX = 6;
  var SKILL_NOTICE_KEY = "skill-notice";
  var SKILL_NOTICE_TTL_MS = 24 * 60 * 60 * 1e3;
  var POLL_MS = 2500;
  var POLL_MS_BUSY = 1e3;
  var AUTO_OPEN_FRESH_MS = 2 * 60 * 1e3;
  var SUGGESTIONS = [
    "Chart this week's numbers",
    "Map this route",
    "Explain this with a diagram",
    "Compare the options"
  ];
  function el2(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }
  function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function explain(error) {
    if (error instanceof HostRequestError) {
      switch (error.code) {
        case "NOT_FOUND":
          return { title: "Visual not found", body: "The file is not there anymore." };
        case "NOT_GRANTED":
          return { title: "File access not granted", body: "Approve the files capability in Settings \u2192 Extensions." };
        case "DISABLED":
          return { title: "Paused", body: "This extension is paused in Settings \u2192 Extensions." };
        case "NO_DIRECTORY":
          return { title: "No project open", body: "Open a project first." };
        case "FILE_TOO_LARGE":
          return { title: "Visual too large", body: "The file is over the read limit." };
        case "HOST_UNAVAILABLE":
          return { title: "Not connected", body: "This panel lost its connection to OpenChamber." };
        default:
          return { title: "Something went wrong", body: `${error.code}: ${error.message}` };
      }
    }
    return { title: "Something went wrong", body: messageOf(error) };
  }
  function mountPanelSurface(deps) {
    const { host, assets, root: root2 } = deps;
    const app = el2("div", "app");
    const bar = el2("header", "bar");
    const title = el2("span", "bar-title");
    title.textContent = "SmolUI";
    const barActions = el2("div", "bar-actions");
    const backSlot = el2("div", "slot");
    barActions.append(backSlot);
    bar.append(title, barActions);
    const noticeHost = el2("div", "notice");
    const promptRow = el2("form", "prompt-row");
    const promptInput = el2("input", "prompt-input");
    promptInput.type = "text";
    promptInput.placeholder = "Ask for a chart, a map, a plan\u2026";
    promptInput.setAttribute("aria-label", "Ask the agent");
    const promptSlot = el2("div", "slot");
    promptRow.append(promptInput, promptSlot);
    const promptStatus = el2("div", "prompt-status");
    const listHost = el2("div", "list-host");
    const listBox = el2("div");
    const listLoadingHost = el2("div", "loading-host");
    const listStateHost = el2("div");
    const chipHost = el2("div", "chip-row");
    listHost.append(listBox, listLoadingHost, listStateHost, chipHost);
    const viewHost = el2("div", "view-host");
    viewHost.hidden = true;
    const loadingHost = el2("div", "loading-host");
    viewHost.append(loadingHost);
    const metaHost = el2("div", "meta-host");
    metaHost.hidden = true;
    app.append(bar, promptRow, promptStatus, noticeHost, listHost, viewHost, metaHost);
    root2.append(app);
    const renderer = createRenderer({ container: viewHost, host, assets });
    let entries = [];
    let listState = "loading";
    let listError = "";
    let paintedSignature = null;
    let state = "list";
    let openPath = null;
    let openMtime = 0;
    let openInfo = null;
    let lastDirectory;
    let pollTimer = null;
    let lastPollAt = 0;
    let ticking = false;
    let listGeneration = 0;
    let busy = false;
    let history = [];
    let knownPaths = /* @__PURE__ */ new Set();
    let newestSeen = null;
    let stateBlock = null;
    let noticeBlock = null;
    let metaButton = null;
    let loadingBlock = null;
    let chipButtons = [];
    const list = mountList(listBox, {
      items: [],
      ariaLabel: "Visuals",
      onSelect: (id) => void openVisual(id)
    });
    mountButton(backSlot, { label: "Back", variant: "ghost", size: "sm", onClick: () => showList() });
    mountButton(promptSlot, { label: "Send", variant: "default", size: "sm", onClick: () => void sendPrompt() });
    promptRow.addEventListener("submit", (event) => {
      event.preventDefault();
      void sendPrompt();
    });
    function toast(kind, message) {
      void host.toast({ kind, message }).catch(() => {
      });
    }
    function clearStateBlock() {
      stateBlock?.dispose();
      stateBlock = null;
      for (const button2 of chipButtons) button2.dispose();
      chipButtons = [];
      chipHost.replaceChildren();
    }
    function clearNotice() {
      noticeBlock?.dispose();
      noticeBlock = null;
    }
    function showNotice(tone2, titleText, body) {
      clearNotice();
      noticeBlock = mountBanner(noticeHost, { tone: tone2, title: titleText, body });
    }
    function clearMeta() {
      metaButton?.dispose();
      metaButton = null;
      metaHost.replaceChildren();
    }
    function showLoading(label) {
      loadingBlock?.dispose();
      loadingBlock = mountSpinner(loadingHost, { label });
    }
    function clearLoading() {
      loadingBlock?.dispose();
      loadingBlock = null;
    }
    function paintState() {
      const visual = state === "visual";
      backSlot.hidden = !visual;
      listHost.hidden = visual;
      viewHost.hidden = !visual;
      metaHost.hidden = !visual;
    }
    function paintList() {
      const signature = entries.map((entry) => `${entry.path}:${entry.mtime}`).join("|");
      if (listState === "ready" && entries.length > 0 && signature === paintedSignature) return;
      paintedSignature = signature;
      clearStateBlock();
      if (listState === "ready" && entries.length > 0) {
        listBox.hidden = false;
        list.update({
          items: entries.map((entry) => ({
            id: entry.path,
            title: entry.slug,
            meta: entry.mtime ? dateLabel(entry.mtime) : ""
          }))
        });
        return;
      }
      listBox.hidden = true;
      if (listState === "loading") {
        stateBlock = mountSpinner(listLoadingHost, { label: "Loading visuals" });
      } else if (listState === "no-project") {
        stateBlock = mountEmpty(listStateHost, {
          title: "No project open",
          body: "Open a project to see its visuals."
        });
      } else if (listState === "no-visuals") {
        stateBlock = mountEmpty(listStateHost, {
          title: "No visuals yet",
          body: "Ask below \u2014 the agent writes a chart, map or plan into .visuals/."
        });
        paintChips();
      } else if (listState === "not-granted") {
        stateBlock = mountBanner(listStateHost, {
          tone: "error",
          title: "File access not granted",
          body: "Approve the files capability in Settings \u2192 Extensions."
        });
      } else if (listState === "disabled") {
        stateBlock = mountBanner(listStateHost, {
          tone: "warning",
          title: "Paused",
          body: "This extension is paused in Settings \u2192 Extensions."
        });
      } else if (listState === "error") {
        stateBlock = mountBanner(listStateHost, { tone: "error", title: "Could not read .visuals", body: listError });
      }
    }
    async function refreshList(quiet) {
      const generation = listGeneration += 1;
      if (!quiet && entries.length === 0) {
        listState = "loading";
        paintedSignature = null;
        paintList();
      }
      let nextEntries = [];
      let nextState;
      let nextError = "";
      try {
        const { entries: directory } = await host.listDir(".visuals");
        const files = directory.filter((entry) => entry.kind === "file" && entry.name.endsWith(FRAGMENT_SUFFIX));
        const stats = await Promise.all(
          files.map(async (file) => {
            const path = `.visuals/${file.name}`;
            const slug = file.name.slice(0, -FRAGMENT_SUFFIX.length);
            try {
              const stat = await host.stat(path);
              return { path, slug, mtime: stat.kind === "file" ? stat.mtime : 0 };
            } catch {
              return { path, slug, mtime: 0 };
            }
          })
        );
        nextEntries = stats.sort((a, b) => b.mtime - a.mtime);
        nextState = nextEntries.length > 0 ? "ready" : "no-visuals";
      } catch (error) {
        if (error instanceof HostRequestError && (error.code === "NOT_FOUND" || error.code === "BAD_PATH")) {
          nextState = "no-visuals";
        } else if (error instanceof HostRequestError && error.code === "NO_DIRECTORY") {
          nextState = "no-project";
        } else if (error instanceof HostRequestError && error.code === "NOT_GRANTED") {
          nextState = "not-granted";
        } else if (error instanceof HostRequestError && error.code === "DISABLED") {
          nextState = "disabled";
        } else {
          nextState = "error";
          nextError = error instanceof HostRequestError ? `${error.code}: ${error.message}` : messageOf(error);
        }
      }
      if (generation !== listGeneration) return null;
      const newest = nextEntries[0] ?? null;
      const change = {
        newest,
        isNew: newest ? !knownPaths.has(newest.path) : false,
        changed: newest && newestSeen ? newestSeen.path === newest.path && newestSeen.mtime !== newest.mtime : false
      };
      knownPaths = new Set(nextEntries.map((entry) => entry.path));
      newestSeen = newest ? { path: newest.path, mtime: newest.mtime } : null;
      entries = nextEntries;
      listState = nextState;
      listError = nextError;
      paintList();
      return change;
    }
    function considerAutoOpen(change, firstLoad) {
      if (state !== "list" || !change.newest) return;
      const fresh = Date.now() - change.newest.mtime < AUTO_OPEN_FRESH_MS;
      const shouldOpen = firstLoad ? busy && fresh : change.isNew || busy && change.changed;
      if (shouldOpen) void openVisual(change.newest.path);
    }
    function paintChips() {
      for (const button2 of chipButtons) button2.dispose();
      chipButtons = [];
      chipHost.replaceChildren();
      if (listState !== "no-visuals") return;
      for (const item of history.length > 0 ? history : SUGGESTIONS) {
        const slot = el2("div", "slot");
        chipHost.append(slot);
        chipButtons.push(
          mountButton(slot, {
            label: item,
            variant: "outline",
            size: "xs",
            onClick: () => {
              promptInput.value = item;
              promptInput.focus();
            }
          })
        );
      }
    }
    async function loadHistory() {
      try {
        const raw = await host.storage.get(PROMPT_HISTORY_KEY);
        const items = raw && typeof raw === "object" && !Array.isArray(raw) ? raw.items : null;
        if (Array.isArray(items)) {
          history = items.filter((item) => typeof item === "string").slice(0, PROMPT_HISTORY_MAX);
        }
      } catch {
      }
    }
    async function rememberPrompt(text) {
      history = [text, ...history.filter((item) => item !== text)].slice(0, PROMPT_HISTORY_MAX);
      try {
        await host.storage.set(PROMPT_HISTORY_KEY, { items: history });
      } catch {
      }
      if (listState === "no-visuals") paintChips();
    }
    async function sendPrompt() {
      const text = promptInput.value.trim();
      if (!text) return;
      const payload = openPath ? `Regarding \`${openPath}\`: ${text}` : text;
      try {
        const result = await host.prompt({ text: payload, send: true });
        if (result.sent !== "sent") {
          toast("info", result.sent === "no-model" ? "No model is selected in the chat." : "The message was not sent.");
          return;
        }
        promptInput.value = "";
        await rememberPrompt(text);
      } catch (error) {
        const message = error instanceof HostRequestError && error.code === "SESSION_BUSY" ? "The session is busy; try again when it finishes." : error instanceof HostRequestError && error.code === "NO_SESSION" ? "Open a chat first, then ask." : error instanceof HostRequestError && error.code === "NOT_GRANTED" ? "Approve the prompt capability in Settings \u2192 Extensions." : error instanceof HostRequestError ? `Could not send: ${error.message}` : "Could not send the prompt.";
        toast("error", message);
      }
    }
    async function consumeOpenRequest() {
      try {
        const raw = await host.storage.get(OPEN_REQUEST_KEY2);
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
        const name = raw.name;
        if (typeof name !== "string") return;
        await host.storage.delete(OPEN_REQUEST_KEY2);
        const at = raw.at;
        if (typeof at === "number" && Date.now() - at > OPEN_REQUEST_TTL_MS) return;
        const slug = name.endsWith(FRAGMENT_SUFFIX) ? name.slice(0, -FRAGMENT_SUFFIX.length) : name;
        const entry = entries.find((candidate) => candidate.slug === slug);
        if (entry) void openVisual(entry.path);
      } catch {
      }
    }
    function showList() {
      state = "list";
      openPath = null;
      openInfo = null;
      clearNotice();
      clearMeta();
      clearLoading();
      renderer.clear();
      paintState();
      void refreshList(false);
    }
    async function paintMeta() {
      clearMeta();
      if (!openInfo || !openPath) return;
      const line = el2("div", "meta-line");
      const size = el2("span", "meta-item");
      size.textContent = `${formatBytes(openInfo.bytes)} \xB7 ${libsLabel(openInfo.libs)}`;
      line.append(size);
      const download = openPath.replace(/\.visual\.html$/, ".html");
      const downloadLabel = el2("span", "meta-item meta-download");
      let exists = false;
      try {
        exists = (await host.stat(download)).kind === "file";
      } catch {
        exists = false;
      }
      downloadLabel.textContent = exists ? download : `${download} (not built yet)`;
      line.append(downloadLabel);
      const copySlot = el2("div", "slot");
      line.append(copySlot);
      metaHost.append(line);
      metaButton = mountButton(copySlot, {
        label: "Copy path",
        variant: "outline",
        size: "xs",
        onClick: () => {
          void host.writeClipboard(download).then(() => toast("info", "Download path copied")).catch(() => toast("error", "Could not copy the path"));
        }
      });
    }
    async function openVisual(path) {
      const switching = openPath !== path;
      state = "visual";
      openPath = path;
      openInfo = null;
      clearNotice();
      clearMeta();
      if (switching) renderer.clear();
      paintState();
      showLoading("Loading visual");
      try {
        const { content } = await host.readFile(path);
        if (openPath !== path) return;
        const info = await renderer.render(content);
        if (openPath !== path || state !== "visual") {
          renderer.clear();
          return;
        }
        if (!info) return;
        openInfo = info;
        try {
          openMtime = (await host.stat(path)).mtime;
        } catch {
          openMtime = 0;
        }
        if (info.versionWarning) {
          showNotice(
            "warning",
            "Newer visual format",
            "This visual was written for a newer stylesheet version than this extension ships; it renders as best it can."
          );
        }
        await paintMeta();
      } catch (error) {
        if (openPath !== path || state !== "visual") return;
        renderer.clear();
        if (error instanceof RenderError) {
          const titles = {
            "too-large": "Visual too large",
            assets: "Could not load visual assets",
            build: "Could not build this visual"
          };
          clearNotice();
          noticeBlock = mountBanner(noticeHost, {
            tone: "error",
            title: titles[error.code] ?? "Could not render this visual",
            body: error.message,
            action: { label: "Retry", onClick: () => void openVisual(path) }
          });
        } else {
          const { title: heading, body } = explain(error);
          const permanent = error instanceof HostRequestError && ["NOT_FOUND", "NOT_GRANTED", "DISABLED", "NO_DIRECTORY", "FILE_TOO_LARGE"].includes(error.code);
          if (permanent) {
            showNotice("error", heading, body);
          } else {
            clearNotice();
            noticeBlock = mountBanner(noticeHost, {
              tone: "error",
              title: heading,
              body,
              action: { label: "Retry", onClick: () => void openVisual(path) }
            });
          }
        }
      } finally {
        clearLoading();
      }
    }
    async function reopenIfChanged() {
      if (!openPath) return;
      try {
        const stat = await host.stat(openPath);
        if (stat.kind !== "file" || stat.mtime === openMtime) return;
      } catch {
        return;
      }
      await openVisual(openPath);
    }
    async function tick() {
      if (ticking || document.visibilityState !== "visible") return;
      ticking = true;
      try {
        if (state === "visual" && openPath) {
          await reopenIfChanged();
          return;
        }
        const change = await refreshList(true);
        if (change) considerAutoOpen(change, false);
        await consumeOpenRequest();
      } finally {
        ticking = false;
      }
    }
    function startPolling() {
      if (pollTimer !== null) return;
      pollTimer = window.setInterval(() => {
        const now = Date.now();
        if (!busy && now - lastPollAt < POLL_MS) return;
        lastPollAt = now;
        void tick();
      }, POLL_MS_BUSY);
    }
    host.onSession((session) => {
      const next = Boolean(session?.busy);
      if (next === busy) return;
      busy = next;
      promptStatus.textContent = busy ? "The agent is writing\u2026" : "";
    });
    host.onSessionLifecycle(({ phase }) => {
      if (phase !== "completed") return;
      void tick();
    });
    host.onDirectory((directory) => {
      const changed = lastDirectory !== void 0 && directory !== lastDirectory;
      lastDirectory = directory;
      if (!changed) return;
      if (state === "visual") showList();
      else void refreshList(true);
    });
    host.onItem((item) => {
      if (!item || item.kind !== "message") return;
      const path = visualPathFromMessage(item.text);
      if (!path) {
        showNotice("info", "No visual in that message", "The message does not name a .visuals/... file.");
        return;
      }
      void openVisual(path);
    });
    void ensureSkill(host).then(async (result) => {
      if (result === "installed") toast("success", "SmolUI skill and tool installed for OpenCode. Restart OpenCode once to load the tool.");
      else if (result === "updated") toast("success", "SmolUI skill and tool updated. Restart OpenCode once to load the tool.");
      else if (result === "unavailable") {
        try {
          const raw = await host.storage.get(SKILL_NOTICE_KEY);
          const at = raw && typeof raw === "object" && !Array.isArray(raw) ? Number(raw.at) : 0;
          if (Number.isFinite(at) && Date.now() - at < SKILL_NOTICE_TTL_MS) return;
          await host.storage.set(SKILL_NOTICE_KEY, { at: Date.now() });
        } catch {
        }
        toast("error", "Skill not installed: approve the local service in Settings \u2192 Extensions.");
      }
    });
    paintState();
    void (async () => {
      await loadHistory();
      const change = await refreshList(false);
      if (change) considerAutoOpen(change, true);
      await consumeOpenRequest();
      startPolling();
    })();
    return {
      setTheme(mode) {
        renderer.setTheme(mode);
      }
    };
  }

  // src/main.ts
  var root = document.querySelector("#root");
  if (!root) throw new Error("panel root element is missing");
  if (window.parent === window) {
    root.className = "standalone-note";
    root.textContent = "SmolUI runs inside OpenChamber. Open it from the rail or the Extensions menu.";
  } else {
    const host = connectHost();
    const assets = createAssets(host);
    let surface = null;
    host.onReady((ctx) => {
      try {
        applyHostReady(ctx, document.documentElement);
      } catch {
      }
      document.body.dataset.surface = ctx.surface;
      if (surface) {
        surface.setTheme(ctx.theme.mode);
        return;
      }
      try {
        surface = ctx.surface === "file" ? mountFileSurface({ host, assets, root }) : mountPanelSurface({ host, assets, root });
        surface.setTheme(ctx.theme.mode);
      } catch (error) {
        root.textContent = `SmolUI failed to start: ${error instanceof Error ? error.message : String(error)}`;
      }
    });
  }
})();
