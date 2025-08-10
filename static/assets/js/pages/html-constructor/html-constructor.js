import { Safe } from "../../utils.ts";

let ID_COUNTER = 0;

function generateID() {
	ID_COUNTER += 1;
	return `id-${ID_COUNTER}`;
}

class HTMLConstructor {
	constructor(htmlElt) {
		this.htmlElt = htmlElt;
		this.children = {};
		this.childArr = [];
	}

	static fromID(id) {
		return new HTMLConstructor(Safe.unwrapHtmlElt(id));
	}

	static fromElt(elt) {
		return new HTMLConstructor(elt);
	}

	get id() {
		return this.htmlElt.id;
	}

	set id(id) {
		this.htmlElt.id = id;
	}

	addClass(...classes) {
		this.htmlElt.classList.add(...classes);
	}

	removeClass(...classes) {
		this.htmlElt.classList.remove(...classes);
	}

	addAttributes(attributes) {
		for (const [key, value] of Object.entries(attributes)) {
			this.htmlElt.setAttribute(key, value);
		}
	}

	appendChild(child) {
		if (child instanceof HTMLConstructor) {
			this.htmlElt.appendChild(child.htmlElt);
			if (!child.id) child.id = generateID();
			this.children[child.id] = child;
			this.childArr.push(child);
			return child;
		} else if (child instanceof HTMLElement) {
			let wrapped = new HTMLConstructor(child);
			return this.appendChild(wrapped);
		} else {
			throw new Error(
				"Only instances of HTMLConstructor or HTMLElement can be passed to this function"
			);
		}
	}

	insertInnerHTML(htmlStr) {
		this.htmlElt.innerHTML = htmlStr;
	}

	appendInnerHTML(htmlStr) {
		this.htmlElt.insertAdjacentHTML("beforeend", htmlStr);
	}

	constructChild(eltType, attributes = {}) {
		if (!attributes.id) attributes.id = generateID();
		let child = document.createElement(eltType);
		let constructor = new HTMLConstructor(child);
		constructor.addAttributes(attributes);
		this.appendChild(constructor);
		return constructor;
	}

	addTextContent(text) {
		this.htmlElt.textContent = text;
	}
}

class TableConstructor extends HTMLConstructor {
	constructor(htmlElt, headID, bodyID) {
		super(htmlElt);
		this.constructChild("thead", { id: headID });
		this.constructChild("tbody", { id: bodyID });
		this.thead = this.children[headID];
		this.tbody = this.children[bodyID];
	}

	static createFromIDs(tableID, headID, bodyID) {
		const table = document.createElement("table");
		table.id = tableID;
		return new TableConstructor(table, headID, bodyID);
	}

	addColumns(colNameArr) {
		const thead = this.thead;
		const tr = thead.constructChild("tr");
		colNameArr.forEach((colName) => {
			const attributes = { scope: "col" };
			tr.constructChild("th", attributes).addTextContent(colName);
		});
	}
}

export { TableConstructor };
