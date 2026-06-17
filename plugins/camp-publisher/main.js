const { Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } = require("obsidian");

const DEFAULT_SETTINGS = {
  campBaseUrl: "https://camp-self.vercel.app",
  supabaseUrl: "https://pjttwbhjkprtdkquvawb.supabase.co",
  supabasePublishableKey: "sb_publishable_r4bVRy5wS8hJZq9Q_YL8mA_5PJ9An9T",
  email: "",
  accessToken: "",
  refreshToken: "",
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed.replace(/'/g, '"'));
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return trimmed.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return trimmed;
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) return { data: {}, body: markdown.trim() };
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: markdown.trim() };

  const raw = markdown.slice(4, end).trim();
  const body = markdown.slice(end + 4).trim();
  const data = {};
  let arrayKey = null;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    if (arrayKey && /^\s+-\s+/.test(line)) {
      data[arrayKey].push(parseScalar(line.replace(/^\s+-\s+/, "")));
      continue;
    }

    arrayKey = null;
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!value) {
      data[key] = [];
      arrayKey = key;
    } else {
      data[key] = parseScalar(value);
    }
  }

  return { data, body };
}

function frontmatterBlock(values) {
  const tags = Array.isArray(values.tags) ? values.tags : [];
  return [
    "---",
    `title: "${values.title}"`,
    `slug: "${values.slug}"`,
    `type: "${values.type}"`,
    `category: "${values.category || "Study"}"`,
    `tags: ${JSON.stringify(tags)}`,
    `excerpt: "${values.excerpt || "TODO: write a short summary"}"`,
    "---",
    "",
  ].join("\n");
}

function firstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function excerptFromBody(markdown) {
  return markdown
    .replace(/^# .+$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>-]/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 220);
}

class LoginModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.email = plugin.settings.email || "";
    this.password = "";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Login to Camp" });

    new Setting(contentEl)
      .setName("Email")
      .addText((text) => text.setValue(this.email).onChange((value) => (this.email = value.trim())));

    new Setting(contentEl)
      .setName("Password")
      .addText((text) => {
        text.inputEl.type = "password";
        text.onChange((value) => (this.password = value));
      });

    new Setting(contentEl).addButton((button) =>
      button.setButtonText("Login").setCta().onClick(async () => {
        try {
          await this.plugin.login(this.email, this.password);
          new Notice("Camp login complete");
          this.close();
        } catch (error) {
          new Notice(`Camp login failed: ${error.message}`);
        }
      }),
    );
  }
}

class CampPublisherPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new CampPublisherSettingTab(this.app, this));

    this.addCommand({
      id: "camp-login",
      name: "Login to Camp",
      callback: () => new LoginModal(this.app, this).open(),
    });

    this.addCommand({
      id: "camp-insert-frontmatter",
      name: "Insert Camp frontmatter",
      editorCallback: (editor) => this.insertFrontmatter(editor),
    });

    this.addCommand({
      id: "camp-validate-current-note",
      name: "Validate current note",
      editorCallback: (editor) => {
        const submission = this.buildSubmission(editor.getValue());
        new Notice(`Camp note valid: ${submission.type}/${submission.slug}`);
      },
    });

    this.addCommand({
      id: "camp-submit-current-note",
      name: "Submit current note to Camp",
      editorCallback: async (editor) => this.submitCurrentNote(editor),
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async login(email, password) {
    if (!this.settings.supabaseUrl || !this.settings.supabasePublishableKey) {
      throw new Error("Set Supabase URL and publishable key first");
    }

    const response = await requestUrl({
      url: `${this.settings.supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
      method: "POST",
      headers: {
        apikey: this.settings.supabasePublishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    this.settings.email = email;
    this.settings.accessToken = response.json.access_token;
    this.settings.refreshToken = response.json.refresh_token;
    await this.saveSettings();
  }


  async refreshSession() {
    if (!this.settings.refreshToken) return false;

    const response = await requestUrl({
      url: `${this.settings.supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`,
      method: "POST",
      headers: {
        apikey: this.settings.supabasePublishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: this.settings.refreshToken }),
      throw: false,
    });

    if (response.status < 200 || response.status >= 300) return false;

    this.settings.accessToken = response.json.access_token;
    this.settings.refreshToken = response.json.refresh_token || this.settings.refreshToken;
    await this.saveSettings();
    return true;
  }

  async submitToCamp(submission) {
    return requestUrl({
      url: `${this.settings.campBaseUrl.replace(/\/$/, "")}/api/content-submissions`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.settings.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submission }),
      throw: false,
    });
  }

  insertFrontmatter(editor) {
    const markdown = editor.getValue();
    if (markdown.startsWith("---\n")) {
      new Notice("This note already has frontmatter");
      return;
    }

    const title = firstHeading(markdown) || "Untitled Camp Note";
    const values = {
      title,
      slug: slugify(title),
      type: "press",
      category: "Study",
      tags: ["camp"],
      excerpt: excerptFromBody(markdown),
    };
    editor.setValue(frontmatterBlock(values) + markdown.trimStart());
    new Notice("Camp frontmatter inserted");
  }

  buildSubmission(markdown) {
    const parsed = parseFrontmatter(markdown);
    const title = String(parsed.data.title || firstHeading(parsed.body) || "").trim();
    const slug = slugify(parsed.data.slug || title);
    const type = String(parsed.data.type || "press").trim();
    const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : String(parsed.data.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    const excerpt = String(parsed.data.excerpt || excerptFromBody(parsed.body)).trim();

    if (!title) throw new Error("Missing title");
    if (!slug) throw new Error("Missing slug");
    if (!["press", "topic", "daily-review", "study-log", "teach"].includes(type)) throw new Error(`Invalid type: ${type}`);
    if (!excerpt) throw new Error("Missing excerpt");

    return {
      title,
      slug,
      type,
      category: String(parsed.data.category || "").trim(),
      tags,
      excerpt,
      markdown: parsed.body,
      status: "published",
    };
  }

  async submitCurrentNote(editor) {
    if (!this.settings.accessToken) {
      new LoginModal(this.app, this).open();
      return;
    }

    const submission = this.buildSubmission(editor.getValue());
    await this.refreshSession();
    let response = await this.submitToCamp(submission);

    if (response.status === 401 || response.status === 403) {
      const refreshed = await this.refreshSession();
      if (refreshed) response = await this.submitToCamp(submission);
    }

    if (response.status < 200 || response.status >= 300) {
      const message = response.json && response.json.error ? response.json.error : response.text;
      throw new Error(message || `Camp submission failed with ${response.status}`);
    }

    const url = response.json && response.json.pullRequest && response.json.pullRequest.url;
    new Notice(url ? `Camp PR created: ${url}` : "Camp PR created");
    if (url) window.open(url);
  }
}

class CampPublisherSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Camp Publisher" });

    new Setting(containerEl)
      .setName("Camp site URL")
      .setDesc("The deployed Camp site that exposes /api/content-submissions.")
      .addText((text) => text.setValue(this.plugin.settings.campBaseUrl).onChange(async (value) => {
        this.plugin.settings.campBaseUrl = value.trim();
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Supabase URL")
      .addText((text) => text.setValue(this.plugin.settings.supabaseUrl).onChange(async (value) => {
        this.plugin.settings.supabaseUrl = value.trim();
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Supabase publishable key")
      .addText((text) => text.setValue(this.plugin.settings.supabasePublishableKey).onChange(async (value) => {
        this.plugin.settings.supabasePublishableKey = value.trim();
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Email")
      .setDesc("Saved for convenience. Password is never saved.")
      .addText((text) => text.setValue(this.plugin.settings.email).onChange(async (value) => {
        this.plugin.settings.email = value.trim();
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Session")
      .setDesc(this.plugin.settings.accessToken ? "Logged in" : "Not logged in")
      .addButton((button) => button.setButtonText("Login").setCta().onClick(() => new LoginModal(this.app, this.plugin).open()))
      .addButton((button) => button.setButtonText("Logout").onClick(async () => {
        this.plugin.settings.accessToken = "";
        this.plugin.settings.refreshToken = "";
        await this.plugin.saveSettings();
        this.display();
      }));
  }
}

module.exports = CampPublisherPlugin;
