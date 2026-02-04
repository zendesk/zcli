import { Command, Flags } from '@oclif/core'

export default class Create extends Command {
    static examples = [
    ]

    static flags = {
        help: Flags.help({ char: 'h' }),
    }

    static args = [
        {
            name: 'path',
            description: 'path to connector directory (will use src/ folder inside)'
        }
    ]

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Create)
    }
}
