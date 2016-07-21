import Plugin from 'stc-plugin';

const REG_CSS_URL = /\s*url\(/;

export default class SpritePlugin extends Plugin {
    /**
     * run
     */
    async run() {
        let tokens = await this.getAst();
        await Promise.all(
            tokens.map((token, idx) => {
                if (token.type === TokenType.CSS_VALUE) {
                    if (REG_CSS_URL.test(token.value)) {
                        return idx;
                    }
                }
            }).filter(idx => typeof idx !== "undefined")
            .map(idx => this.handleCSSTokenPromise(tokens, idx))
        );
        return { tokens };
    }

    /**
     * handleCSSTokenPromise()
     * For each CSS_VALUE token containing `url()`,
     * return a promise which
     * modify its value to base64 file content
     */
    async handleCSSTokenPromise(allToken, idx) {
    }

    update(data) {}

    static cluster() {
        return true;
    }

    static cache() {
        return false;
    }

    static include() {
        return /\.css$/;
    }
}