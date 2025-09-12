import { Safe } from "../../html-safe.ts";
import DOC_ELEMENTS from "../page-utilities/doc-element-references.ts";

const STYLES = {
	RED: "text-danger",
	GREEN: "text-safe",
	E_BLUE: "text-e-blue",
};

class TextPacket {
	constructor(text, docElement, classList=[]) {
		this.text = text;
		this.docElement = docElement;
		this.classList = classList;
	}
}

function assertTextPacket(textPacket) {
	if (!textPacket instanceof TextPacket) {
		throw new Error(
			"Only instances of TextPacket can be passed to this function"
		);
	}
}

let TextController = {
	queue: [],
	autoClearElements: [],

	TextPacket: TextPacket,
	STYLES: STYLES,

	clearStyles: function (docElement) {
		for (const style of Object.values(STYLES)) {
			docElement.classList.remove(style);
		}
	},

	write: function (TextPacket) {
		assertTextPacket(TextPacket);
		TextPacket.docElement.textContent = TextPacket.text;
		this.clearStyles(TextPacket.docElement);
		TextPacket.classList.forEach((className) => {
			TextPacket.docElement.classList.add(className);
		});
	},

	writeStr: function (text, docElement, classList=[]) {
		this.write(new TextPacket(text, docElement, classList));
	},

	writeStrFromID: function (text, id, classList=[]) {
		const elt = Safe.unwrapHtmlElt(id);
		this.writeStr(text, elt, classList);
	},

	push: function (TextPacket) {
		assertTextPacket(TextPacket);
		this.queue.push(TextPacket);
	},

	pushFromObj: function ({ text, docElement, classList }) {
		this.push(new TextPacket(text, docElement, classList));
	},

	bindAutoClear: function (elementList) {
		// Only used to clear messages automatically when swiching page states
		for (const element of elementList) {
			this.autoClearElements.push(element);
		}
	},

	processQueue: function () {
		this.queue.forEach((TextPacket) => {
			this.write(TextPacket);
		});
		this.queue = [];
	},

	clearMessages: function () {
		for (const element of this.autoClearElements) {
			element.textContent = "";
			this.clearStyles(element);
		}
	},
};

function queueSelectDataMsgGreen(msg) {
	TextController.push(
		new TextPacket(msg, DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG, [STYLES.GREEN])
	);
}

function queueSelectDataMsgRed(msg) {
	TextController.push(
		new TextPacket(msg, DOC_ELEMENTS.HOME_PAGE.SELECT_DATA_MSG, [STYLES.RED])
	);
}

function queueFilterMsgGreen(msg) {
	TextController.push(
		new TextPacket(msg, DOC_ELEMENTS.HOME_PAGE.FILTER_MSG, [STYLES.GREEN])
	);
}

function queueFilterMsgRed(msg) {
	TextController.push(
		new TextPacket(msg, DOC_ELEMENTS.HOME_PAGE.FILTER_MSG, [STYLES.RED])
	);
}

let TextUtils = {
	queueSelectDataMsgGreen,
	queueSelectDataMsgRed,
	queueFilterMsgGreen,
	queueFilterMsgRed,
};

export { TextController, TextPacket, TextUtils };
