import validator from '@rjsf/validator-ajv8';
import {UiSchema} from '@rjsf/utils';
import Form from "@rjsf/core";
import React, {useEffect, useState} from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";


const BaseInputTemplate = (props) => {
    const {id, options, required, readonly, disabled, value, onChange, onBlur, onFocus, schema, ...rest} = props;

    return (
        <input
            id={id}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            type={schema.type}
            required={required}
            disabled={disabled || readonly}
            value={value || ""}
            placeholder={options.placeholder || ""}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
        />
    );
}


const CustomFieldTemplate = (props) => {
    let {id, label, help, required, description, errors, children} = props;

    if (label.includes("-1")) {
        label = null
        description = null
    }

    return (
        <div className="mb-4">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                    {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                </label>
            )}
            {description && <div className="mt-4 text-gray-500 dark:text-gray-400 mb-1">{description}</div>}
            {children}
            {errors && <div className="text-red-500 dark:text-red-400 text-xs mt-1">{errors}</div>}
            {help && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{help}</div>}
        </div>
    );
};

const CustomObjectFieldTemplate = (props) => {
    return (
        <div className="rounded-md p-4 mb-4">
            {props.properties.map((prop) => prop.content)}
        </div>
    );
};

const CustomSubmitButton = (props) => {
    return (
        <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
        >
            {props.uiSchema["ui:submitButtonOptions"]?.submitText || "Submit"}
        </button>
    );
};


const CustomWidgets = {
    KeyValueTagsWidget: (props) => {
        const {value = [], onChange, schema, uiSchema} = props;


        const [keyInput, setKeyInput] = useState('');
        const [valueInput, setValueInput] = useState('');
        const [error, setError] = useState(null);


        const uiOptions = uiSchema?.["ui:options"] || {};
        const keyPlaceholder = uiOptions.keyPlaceholder || 'Key';
        const valuePlaceholder = uiOptions.valuePlaceholder || 'Value';
        const tagStyle = uiOptions.tagStyle || {};


        const handleAdd = () => {

            if (!keyInput.trim()) {
                setError('Key cannot be empty');
                return;
            }


            const isDuplicate = value.some(item => item.key === keyInput.trim());
            if (isDuplicate) {
                setError(`Key "${keyInput}" already exists`);
                return;
            }


            const newItem = {key: keyInput.trim(), value: valueInput.trim()};
            onChange([...value, newItem]);


            setKeyInput('');
            setValueInput('');
            setError(null);
        };


        const handleRemove = (index) => {
            const newValue = [...value];
            newValue.splice(index, 1);
            onChange(newValue);
        };


        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
            }
        };

        return (
            <div className="w-full">
                {/* Input area for new tags */}
                <div className="flex mb-2 gap-2">
                    <input
                        type="text"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={keyPlaceholder}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        style={{
                            display: 'inline-block',
                            width: '40%',
                            marginRight: '10px'
                        }}
                    />
                    <input
                        type="text"
                        value={valueInput}
                        onChange={(e) => setValueInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={valuePlaceholder}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        style={{
                            display: 'inline-block',
                            width: '40%',
                            marginRight: '10px'
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                    >
                        +
                    </button>
                </div>

                {/* Error message */}
                {error && (
                    <div className="mb-2 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Tags display area */}
                <div className="flex flex-wrap gap-2">
                    {value.length === 0 && (
                        <div className="text-gray-500 dark:text-gray-400 text-sm italic">No tags added yet</div>
                    )}

                    {value.map((item, index) => (
                        <div
                            key={index}
                            className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm"
                        >
                            <span className="font-medium">{item.key}</span>
                            <span className="mx-1">:</span>
                            <span>{item.value}</span>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="ml-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                                aria-label={`Remove tag ${item.key}`}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                          clipRule="evenodd"/>
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    },

    DefaultValueOverrideWidget: (props) => {
        const {id, value, onChange, schema, options, disabled, readonly} = props;


        const defaultValue = schema.default || "";


        const hasDefaultValue = defaultValue !== "";


        const [overrideEnabled, setOverrideEnabled] = React.useState(() => {
            return value !== undefined && value !== null && value !== "" && value !== defaultValue;
        });


        const inputValue = overrideEnabled ? value : defaultValue;


        const handleToggleChange = () => {
            if (disabled || readonly || !hasDefaultValue) return;


            const newOverrideState = !overrideEnabled;
            setOverrideEnabled(newOverrideState);


            if (newOverrideState) {

                onChange(defaultValue);
            } else {

                onChange(undefined);
            }
        };


        const handleInputChange = (e) => {
            if (disabled || readonly || !overrideEnabled) return;
            onChange(e.target.value);
        };


        React.useEffect(() => {
            const isOverridden = value !== undefined && value !== null && value !== "" && value !== defaultValue;
            if (isOverridden !== overrideEnabled) {
                setOverrideEnabled(isOverridden);
            }
        }, [value, defaultValue]);

        return (
            <div className="w-full">
                {options.label && (
                    <label htmlFor={`${id}-input`}
                           className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {options.label}
                    </label>
                )}

                <div className="flex items-center space-x-3">
                    {/* Toggle switch - disabled if no default value exists */}
                    <div
                        className={`relative inline-flex items-center ${hasDefaultValue ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                            type="checkbox"
                            id={`${id}-toggle`}
                            className="sr-only peer"
                            checked={overrideEnabled}
                            disabled={!hasDefaultValue || disabled || readonly}
                            onChange={handleToggleChange}
                        />
                        <div
                            className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                            onClick={hasDefaultValue && !disabled && !readonly ? handleToggleChange : undefined}
                        ></div>
                        <span
                            className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-200"
                            onClick={hasDefaultValue && !disabled && !readonly ? handleToggleChange : undefined}
                        >
              {overrideEnabled ? "Custom value" : "Default value"}
            </span>
                    </div>

                    {/* Input field */}
                    <div className="flex-1">
                        <input
                            type="text"
                            id={`${id}-input`}
                            value={inputValue}
                            onChange={handleInputChange}
                            disabled={!overrideEnabled || disabled || readonly}
                            placeholder={options.placeholder || "Enter value"}
                            className={`bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5
                ${!overrideEnabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : ''}
                ${disabled || readonly ? 'cursor-not-allowed opacity-75' : ''}
              `}
                        />
                    </div>
                </div>

                {!overrideEnabled && hasDefaultValue && (
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Using default: {defaultValue}
                    </div>
                )}

                {!hasDefaultValue && (
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        No default value available
                    </div>
                )}
            </div>
        );
    },

    CheckboxesWidget: (props) => {
        const {id, options, value = [], required, disabled, readonly, onChange, label} = props;
        const {enumOptions} = options;



        const currentValue = Array.isArray(value) ? value[0] : value;

        return (
            <div className="flex flex-row justify-center items-center w-full">
                <div className="flex space-x-3">
                    {enumOptions.map((option) => {
                        const isSelected = currentValue === option.value;
                        return (
                            <div key={option.value} className="w-32 h-16">
                                <input
                                    type="radio"
                                    id={`${id}_${option.value}`}
                                    name={id}
                                    value={option.value}
                                    className="sr-only peer"
                                    checked={isSelected}
                                    required={required}
                                    disabled={disabled || readonly}
                                    onChange={() => {
                                        if (disabled || readonly) return;
                                        onChange(option.value);
                                    }}
                                />
                                <label
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!disabled && !readonly) {
                                            onChange(option.value);
                                        }
                                    }}
                                    htmlFor={`${id}_${option.value}`}
                                    className={`flex items-center justify-center w-full h-full text-center rounded-md border-2 cursor-pointer transition-all duration-200 text-sm
                                    ${isSelected
                                        ? 'bg-blue-600 border-blue-700 text-white'
                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}
                                    ${disabled || readonly ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                >
                                    <span className="font-medium">{option.label}</span>
                                </label>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    },
    CheckboxWidget: (props) => {
        const {id, value, required, disabled, readonly, onChange, label} = props;

        return (
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id={id}
                    className="peer sr-only"
                    checked={value || false}
                    required={required}
                    disabled={disabled || readonly}
                    onChange={(event) => {
                        onChange(event.target.checked)
                    }}
                />
                <label
                    htmlFor={id}
                    className={`flex items-center cursor-pointer text-sm
          ${value ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-400'}
          ${disabled || readonly ? 'opacity-50 cursor-not-allowed' : ''}
        `}
                >
        <span
            className={`relative flex-shrink-0 w-6 h-6 border-2 rounded-md transition-colors
            ${value ? ' border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700' : 'border-gray-300 dark:border-gray-600'}`}
        >
          {value && (
              <svg
                  className="absolute inset-0 w-5 h-5 text-black dark:text-white m-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
              >
                  <path
                      strokeLinecap="square"
                      strokeLinejoin="square"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                  ></path>
              </svg>
          )}
        </span>
                    <span className="ml-2">{label}</span>
                </label>
            </div>
        );
    },
    SelectWidget: (props) => {
        const {id, options, value, required, disabled, readonly, onChange, label, multiple} = props;
        const {enumOptions} = options;

        return (
            <select
                id={id}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                value={value}
                required={required}
                disabled={disabled || readonly}
                multiple={multiple}
                onChange={(event) => {
                    const newValue = event.target.value;
                    onChange(newValue);
                }}
            >
                {enumOptions.map(({value, label}) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </select>
        );
    },

    PasswordWidget: (props) => {
        const {id, required, readonly, disabled, value, onChange} = props;

        return (
            <input
                id={id}
                type="password"
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                required={required}
                disabled={disabled || readonly}
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
            />
        );
    },
}


const genericUiSchema: UiSchema = {
    "scale": {
        "ui:widget": "CheckboxesWidget",
    },
    "workflow": {
        "ui:widget": "DefaultValueOverrideWidget",
    },
    "registryPath": {
        "ui:widget": "DefaultValueOverrideWidget",
    },
    "expiration": {
        "ui:widget": "DefaultValueOverrideWidget",
    },
    "database": {
        "ui:widget": "DefaultValueOverrideWidget",
    },
    "tags": {
        "ui:widget": "KeyValueTagsWidget",
    },
    "items": {

        "ui:options": {
            orderable: false,
            removable: false,
            addable: false
        }
    },
};

const CustomArrayFieldTemplate = (props) => {
    const {items} = props;


    useEffect(() => {

        if (items.length === 0 && props.onAddClick) {
            props.onAddClick();
        }
    }, [items.length, props]);
    return (
        <div className="space-y-3">
            {items.map((element) => (
                <div key={element.key} className="flex items-start">
                    <div
                        className="flex-grow bg-gray-50 dark:bg-gray-700 p-3 border border-gray-200 dark:border-gray-600">
                        {element.children}
                    </div>
                </div>
            ))}
        </div>
    );
};


export default function TailwindThemedForm({schema, uiSchema, ...props}) {

    const mergedUiSchema = {...genericUiSchema, ...uiSchema};

    return (
        <div
            className="m-4 bg-white-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-3">
            <Form
                schema={schema}
                uiSchema={uiSchema}
                validator={validator}
                widgets={CustomWidgets}
                templates={{
                    FieldTemplate: CustomFieldTemplate,
                    ObjectFieldTemplate: CustomObjectFieldTemplate,
                    ArrayFieldTemplate: CustomArrayFieldTemplate,
                    BaseInputTemplate,
                    ButtonTemplates: {
                        SubmitButton: CustomSubmitButton
                    }
                }}
                {...props}
            />
        </div>
    );
};
