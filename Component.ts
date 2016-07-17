import * as ko from "knockout";
import * as kontainer from "kontainer";

export interface ComponentParams {
    selector: string;
    template?: string;
    templateUrl?: string;
    directives?: Function[];
}

interface InjectParam {
    index: number;
    dependency: string;
}

const injectMetadataKey = Symbol("inject");

export function Inject(token: string) {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        const existingInjectParameters: InjectParam[] = Reflect.getOwnMetadata(injectMetadataKey, target, propertyKey) || [];
        existingInjectParameters.push({
            index: parameterIndex,
            dependency: token
        });

        Reflect.defineMetadata(injectMetadataKey, existingInjectParameters, target, propertyKey);
    };
}

export function Component(options: ComponentParams) {
    return (target: { new (...args) }) => {
        if (!ko.components.isRegistered(options.selector)) {
            if (!options.template && !options.templateUrl) {
                throw Error(`Component ${target.name} must have template`);
            }

            const factory = getFactory(target);
            const config = {
                template: options.template || { require: options.templateUrl },
                viewModel: factory
            };

            ko.components.register(options.selector, config);
        }
    };
}

export function Injectable() {
    return (target: { new (...args) }) => {
        if (!kontainer.isRegistered(target.name)) {
            const factory = getFactory(target);
            kontainer.registerFactory(target.name, factory);
        }
    };
}

function getFactory(target: { new (...args) }) {
    const deps = Reflect.getMetadata("design:paramtypes", target).map(type => type.name);

    const injectParameters: InjectParam[] = Reflect.getOwnMetadata(injectMetadataKey, target) || [];
    for (const param of injectParameters) {
        deps[param.index] = param.dependency;
    }

    const factory = (...args) => new target(...args);
    return [...deps, factory];
}