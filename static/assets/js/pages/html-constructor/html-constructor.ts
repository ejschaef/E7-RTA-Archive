import { Safe } from "../../utils.ts";

let ID_COUNTER = 0;

function generateID() {
	ID_COUNTER += 1;
	return `id-${ID_COUNTER}`;
}

export type HTMLComposeElement = {
	tag: string;
	attributes?: { [key: string]: string };
	children?: HTMLComposeElement[];
	style?: string;
	textContent?: string[] | string;
	classes?: string[];
	innerHtml?: string;
}

class HTMLConstructor {
	htmlElt: HTMLElement;
	children: { [id: string]: HTMLConstructor };
	childArr: HTMLConstructor[];

	constructor(htmlElt: HTMLElement) {
		this.htmlElt = htmlElt;
		this.children = {};
		this.childArr = [];
	}

	static fromID(id: string) {
		return new HTMLConstructor(Safe.unwrapHtmlElt(id));
	}

	static fromElt(elt: HTMLElement) {
		return new HTMLConstructor(elt);
	}

	get id(): string {
		return this.htmlElt.id;
	}

	set id(id) {
		this.htmlElt.id = id;
	}

	addClass(...classes: string[]) {
		this.htmlElt.classList.add(...classes);
	}

	addStyle(style: string) {
		this.htmlElt.setAttribute("style", style);
	}

	removeClass(...classes: string[]) {
		this.htmlElt.classList.remove(...classes);
	}

	addAttributes(attributes: { [key: string]: string }) {
		for (const [key, value] of Object.entries(attributes)) {
			this.htmlElt.setAttribute(key, value);
		}
	}

	appendChild(child: HTMLConstructor | HTMLElement): HTMLConstructor {
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

	setInnerHtml(htmlStr: string) {
		this.htmlElt.innerHTML = htmlStr;
	}

	appendInnerHTML(htmlStr: string) {
		this.htmlElt.insertAdjacentHTML("beforeend", htmlStr);
	}

	constructChild(eltType: string, attributes: { [key: string]: string } = {}) {
		if (!attributes.id) attributes.id = generateID();
		let child = document.createElement(eltType);
		let constructor = new HTMLConstructor(child);
		constructor.addAttributes(attributes);
		this.appendChild(constructor);
		return constructor;
	}

	addTextContent(text: string) {
		this.htmlElt.textContent = text;
	}

	compose(elements: HTMLComposeElement[]) {
		for (const element of elements) {
			if (element.textContent instanceof Array) {
				const subElements = [];
				for (const text of element.textContent) {
					const subElt = Object.assign({}, element);
					subElt.textContent = text;
					subElements.push(subElt);
				}
				this.compose(subElements);
				continue;
			};
			let child = this.constructChild(element.tag, element.attributes);
			if (element.classes) child.addClass(...element.classes);
			if (element.children) child.compose(element.children);
			if (element.textContent) child.addTextContent(element.textContent);
			if (element.style) child.addStyle(element.style);
			if (element.innerHtml) child.setInnerHtml(element.innerHtml);
		
		};
	}
}

class TableConstructor extends HTMLConstructor {
	thead: HTMLConstructor;
	tbody: HTMLConstructor;

	constructor(htmlElt: HTMLElement, headID: string, bodyID: string) {
		super(htmlElt);
		this.constructChild("thead", { id: headID });
		this.constructChild("tbody", { id: bodyID });
		this.thead = this.children[headID];
		this.tbody = this.children[bodyID];
	}

	static createFromIDs(tableID: string, headID: string, bodyID: string) {
		const table = document.createElement("table");
		table.id = tableID;
		return new TableConstructor(table, headID, bodyID);
	}

	addColumns(colNameArr: string[]) {
		const thead = this.thead;
		const tr = thead.constructChild("tr");
		colNameArr.forEach((colName) => {
			const attributes = { scope: "col" };
			tr.constructChild("th", attributes).addTextContent(colName);
		});
	}
}

export { TableConstructor, HTMLConstructor };
