import { Safe } from "../../html-safe.ts";

let ID_COUNTER = 0;

function generateID() {
	ID_COUNTER += 1;
	return `id-${ID_COUNTER}`;
}

export const ComposeOption ={
	NEST: "nest", // all subsequent compose elements will be children
	ADJ: "adj", // all subsequent compose elements will be siblings
} as const;

export type ComposeOption = typeof ComposeOption[keyof typeof ComposeOption];

export type HTMLComposeElement = {
	tag: string;
	attributes?: { [key: string]: string };
	children?: HTMLComposeElement[];
	style?: string;
	textContent?: string[] | string;
	classes?: string[];
	innerHtml?: string;
	option?: ComposeOption;
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

	/**
	 * Constructs a tree of HTMLConstructors from an array of HTMLComposeElements.
	 *
	 * @param {HTMLComposeElement[]} elements - An array of HTMLComposeElements
	 * representing the structure and content of the HTML tree.
	 */
	compose(elements: HTMLComposeElement[]): void {
		for (let i = 0 ; i < elements.length; i++) {
			const element = elements[i];
			if (element.option === ComposeOption.NEST) {  // all subsequent compose elements will be children
				if (element.children) {
					element.children = [...element.children, ...elements.slice(i + 1)];
				} else {
					element.children = elements.slice(i + 1);
				}
				element.option = ComposeOption.ADJ;
				this.compose([element]);
				return;
			};
			if (element.textContent instanceof Array) { // create adjacent copies of element using the different text
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


// Compose Functions used to more easly write HTML compose lists

type CardArg = {
	content?: HTMLComposeElement[],
	classes?: string[],
}

function cardNest({ content, classes }: CardArg = {}): HTMLComposeElement[] {
  return [
	{
		tag: "div",
   		classes: ["col-sm-12"].concat(classes ?? []),
		option: ComposeOption.NEST
	},
	{
		tag: "div",
		classes: ["card"],
		children: content,
		option: ComposeOption.NEST
	},
  ]
}

type CardBodyArgs = {
  composeList?: HTMLComposeElement[],
  classes?: string[]
  option?: ComposeOption
}

function cardBody({ composeList, classes, option }: CardBodyArgs): HTMLComposeElement {
  return {
    tag: "div",
    classes: ["card-body", "pc-component"].concat(classes ?? []),
    option: option,
    children: composeList
  }
}

function paragraph(text: string, classes?: string[]): HTMLComposeElement {
  return {
    tag: "p",
    textContent: text,
    classes: classes
  }
}

function header(text: string, hNum = 1, classes?: string[]): HTMLComposeElement {
  return {
    tag: "h" + hNum,
    textContent: text,
    classes: classes
  }
}

function hr(): HTMLComposeElement {
  return {
	tag: "hr"
  }
}

function br(): HTMLComposeElement {
  return {
	tag: "br"
  }
}

type ListElementArgs = {
  outertag?: string,
  outerclasses?: string[],
  innertag?: string,
  innerclasses?: string[],
  textList: string[]
}

function listElement({ outertag, outerclasses, innertag, innerclasses, textList }: ListElementArgs): HTMLComposeElement {
  return {
    tag: outertag ?? "ul",
    classes: outerclasses ?? [],
    children: [
      {
        tag: innertag ?? "li",
        classes: innerclasses ?? [],
        textContent: textList
      }
    ]
  }
}


const ComposeFns = {
	cardNest,
	cardBody,
	paragraph,
	header,
	hr,
	br,
	listElement,
}



export { TableConstructor, HTMLConstructor, ComposeFns };
