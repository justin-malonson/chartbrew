import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { TbMathFunctionY } from "react-icons/tb";
import { LuCheckCircle, LuInfo, LuWand2, LuXCircle } from "react-icons/lu";

import ChartPreview from "../AddChart/components/ChartPreview";
import Row from "../../components/Row";
import { Autocomplete, AutocompleteItem, Chip, Divider, Input, Link, Popover, PopoverContent, PopoverTrigger, Select, SelectItem, Spacer, Tooltip } from "@nextui-org/react";
import Text from "../../components/Text";
import autoFieldSelector from "../../modules/autoFieldSelector";
import fieldFinder from "../../modules/fieldFinder";
import { updateDataset } from "../../slices/dataset";
import { operations } from "../../modules/filterOperations";
import { runQuery, updateChart } from "../../slices/chart";
import FormulaTips from "../../components/FormulaTips";
import DatasetFilters from "../../components/DatasetFilters";


function DatasetBuilder(props) {
  const { chart, projectId } = props;

  const [fieldOptions, setFieldOptions] = useState([]);
  const [formula, setFormula] = useState("");

  const params = useParams();
  const dispatch = useDispatch();
  const initRef = useRef(null);
  
  const dataset = useSelector((state) => state.dataset.data.find((d) => `${d.id}` === `${params.datasetId}`));
  const datasetResponse = useSelector((state) => state.dataset.responses.find((r) => r.dataset_id === dataset.id)?.data);

  useEffect(() => {
    if (dataset.formula) {
      setFormula(dataset.formula);
    }
  }, [dataset]);

  useEffect(() => {
    if (chart && dataset && !datasetResponse && !initRef.current) {
      initRef.current = true;
      dispatch(runQuery({
        project_id: projectId,
        chart_id: chart.id,
        noSource: false,
        skipParsing: false,
        getCache: true,
      }))
        .catch(() => {
          toast.error("Could not refresh the dataset. Please check your query.");
        });
    }
  }, [chart, dataset, datasetResponse]);

  useEffect(() => {
    if (datasetResponse) {
      let tempFieldOptions = [];
      const tempObjectOptions = [];
      const fieldsSchema = {};
      const updateObj = {};

      const fields = fieldFinder(datasetResponse);
      const objectFields = fieldFinder(datasetResponse, false, true);

      fields.forEach((o) => {
        if (o.field) {
          let text = o.field && o.field.replace("root[].", "").replace("root.", "");
          if (o.type === "array") text += "(get element count)";
          tempFieldOptions.push({
            key: o.field,
            text: o.field && text,
            value: o.field,
            type: o.type,
            label: {
              style: { width: 55, textAlign: "center" },
              content: o.type || "unknown",
              size: "mini",
              color: o.type === "date" ? "secondary"
                : o.type === "number" ? "primary"
                  : o.type === "string" ? "success"
                    : o.type === "boolean" ? "warning"
                      : "default"
            },
          });
        }
        fieldsSchema[o.field] = o.type;
      });

      objectFields.forEach((obj) => {
        if (obj.field) {
          let text = obj.field && obj.field.replace("root[].", "").replace("root.", "");
          if (obj.type === "array") text += "(get element count)";
          tempObjectOptions.push({
            key: obj.field,
            text: obj.field && text,
            value: obj.field,
            type: obj.type,
            isObject: true,
            label: {
              style: { width: 55, textAlign: "center" },
              content: obj.type || "unknown",
              size: "mini",
              color: obj.type === "date" ? "secondary"
                : obj.type === "number" ? "primary"
                  : obj.type === "string" ? "success"
                    : obj.type === "boolean" ? "warning"
                      : "default"
            },
          });
        }
        fieldsSchema[obj.field] = obj.type;
      });

      if (Object.keys(fieldsSchema).length > 0) updateObj.fieldsSchema = fieldsSchema;

      tempFieldOptions = tempFieldOptions.concat(tempObjectOptions);

      setFieldOptions(tempFieldOptions);

      // initialise values for the user if there were no prior selections
      const autoFields = autoFieldSelector(tempFieldOptions);
      Object.keys(autoFields).forEach((key) => {
        if (!dataset[key]) updateObj[key] = autoFields[key];
      });

      // update the operation only if the xAxis and yAxis were not set initially
      if (!dataset.xAxis && !dataset.yAxis && autoFields.yAxisOperation) {
        updateObj.yAxisOperation = autoFields.yAxisOperation;
      }

      if (Object.keys(updateObj).length > 0) {
        dispatch(updateDataset({
          team_id: dataset.team_id,
          dataset_id: dataset.id,
          data: updateObj,
        }));
      }
    }
  }, [datasetResponse]);

  const _filterOptions = (axis) => {
    let filteredOptions = fieldOptions;
    if (axis === "x" && chart.type !== "table") {
      filteredOptions = filteredOptions.filter((f) => {
        if (f.type === "array" || (f.value && f.value.split("[]").length > 2)) {
          return false;
        }

        return true;
      });
    }

    if (chart.type !== "table") return filteredOptions;

    filteredOptions = fieldOptions.filter((f) => f.type === "array");

    if (axis === "x") {
      filteredOptions = filteredOptions.filter((f) => {
        if (f.type === "array" || (f.value && f.value.split("[]").length > 2)) {
          return false;
        }

        return true;
      });
    }

    const rootObj = {
      key: "root[]",
      text: "Collection root",
      value: "root[]",
      type: "array",
      label: {
        style: { width: 55, textAlign: "center" },
        content: "root",
        size: "mini",
      },
    };

    const [rootField] = fieldOptions.filter((f) => f.value.indexOf([]) > -1);
    if (rootField) {
      rootObj.text = rootField.value.substring(0, rootField.value.lastIndexOf("."));
      rootObj.key = rootField.value.substring(0, rootField.value.lastIndexOf("."));
      rootObj.value = rootField.value.substring(0, rootField.value.lastIndexOf("."));
    }

    if (!filteredOptions) {
      filteredOptions = [rootObj];
    } else {
      filteredOptions.unshift(rootObj);
    }

    return filteredOptions;
  };

  const _getYFieldOptions = () => {
    return fieldOptions;
  };

  const _getDateFieldOptions = () => {
    let filteredOptions = fieldOptions.filter((f) => f.type === "date");

    return filteredOptions;
  };

  const _onUpdateDataset = (data) => {
    dispatch(updateDataset({
      team_id: dataset.team_id,
      dataset_id: dataset.id,
      data,
    }))
      .then(() => {
        toast.success("Dataset updated successfully.");
        return dispatch(runQuery({
          project_id: projectId,
          chart_id: chart.id,
          noSource: false,
          skipParsing: false,
          getCache: true,
        }));
      })
      .catch(() => {
        toast.error("Could not refresh the dataset. Please check your query.");
      });
  };

  const _onRefreshPreview = () => {
    dispatch(runQuery({
      project_id: projectId,
      chart_id: chart.id,
      noSource: false,
      skipParsing: false,
      getCache: true,
    }))
      .catch(() => {
        toast.error("Could not refresh the dataset. Please check your query.");
      });
  };

  const _onUpdateChart = (data) => {
    dispatch(updateChart({
      project_id: projectId,
      chart_id: chart.id,
      data,
    }))
      .catch(() => {
        toast.error("Could not update the chart. Please check your query.");
      });
  };

  const _onAddFormula = () => {
    setFormula("{val}");
  };

  const _onExampleFormula = () => {
    setFormula("${val / 100}");
    _onUpdateDataset({ formula: "${val / 100}" });
  };

  const _onRemoveFormula = () => {
    setFormula("");
    _onUpdateDataset({ formula: "" });
  };

  const _onApplyFormula = () => {
    _onUpdateDataset({ formula });
  };

  return (
    <div className="grid grid-cols-12 divide-x-1 gap-4">
      <div className="col-span-12 md:col-span-4">
        <Row align="center" className={"justify-between"}>
          <div><Text>Dimension</Text></div>
          <Autocomplete
            labelPlacement="outside"
            variant="bordered"
            className="max-w-[300px]"
            placeholder="Select a dimension"
            selectedKey={dataset.xAxis}
            onSelectionChange={(key) => _onUpdateDataset({ xAxis: key })}
          >
            {_filterOptions("x").map((option) => (
              <AutocompleteItem
                key={option.value}
                startContent={(
                  <Chip size="sm" variant="flat" className={"min-w-[70px] text-center"} color={option.label.color}>{option.label.content}</Chip>
                )}
                description={option.isObject ? "Key-Value visualization" : null}
              >
                {option.text}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </Row>
        <Spacer y={4} />
        <Row align="center" className={"justify-between"}>
          <div><Text>Metric</Text></div>
          <Autocomplete
            labelPlacement="outside"
            variant="bordered"
            className="max-w-[300px]"
            placeholder="Select a metric"
            selectedKey={dataset.yAxis}
            onSelectionChange={(key) => _onUpdateDataset({ yAxis: key })}
          >
            {_getYFieldOptions().map((option) => (
              <AutocompleteItem
                key={option.value}
                startContent={(
                  <Chip size="sm" variant="flat" className={"min-w-[70px] text-center"} color={option.label.color}>{option.label.content}</Chip>
                )}
                description={option.isObject ? "Key-Value visualization" : null}
              >
                {option.text}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </Row>
        <Spacer y={2} />
        <Row align={"center"} justify={"flex-end"}>
          <Select
            placeholder="Select an operation"
            labelPlacement="outside"
            onSelectionChange={(keys) => _onUpdateDataset({ yAxisOperation: keys.currentKey })}
            selectedKeys={[dataset.yAxisOperation]}
            selectionMode="single"
            variant="bordered"
            renderValue={(
              <Text>
                {(dataset.yAxisOperation
                  && operations.find((i) => i.value === dataset.yAxisOperation).text
                )
                  || "Operation"}
              </Text>
            )}
            className="max-w-[300px]"
          >
            {operations.map((option) => (
              <SelectItem key={option.value}>
                {option.text}
              </SelectItem>
            ))}
          </Select>
        </Row>
        <Spacer y={4} />
        <Divider />
        <Spacer y={4} />
        <Row align="center" className={"justify-between"}>
          <Autocomplete
            label="Select a date field used for filtering"
            labelPlacement="outside"
            variant="bordered"
            placeholder="Select a field"
            selectedKey={dataset.dateField}
            onSelectionChange={(key) => _onUpdateDataset({ dateField: key })}
          >
            {_getDateFieldOptions().map((option) => (
              <AutocompleteItem
                key={option.value}
                startContent={(
                  <Chip size="sm" variant="flat" className={"min-w-[70px] text-center"} color={option.label.color}>{option.label.content}</Chip>
                )}
              >
                {option.text}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </Row>

        <Spacer y={4} />
        <Divider />
        <Spacer y={4} />

        {!formula && (
          <Link onClick={_onAddFormula} className="flex items-center cursor-pointer">
            <TbMathFunctionY size={24} />
            <Spacer x={0.5} />
            <Text>Apply formula on metrics</Text>
          </Link>
        )}
        {formula && (
          <Row align={"center"} justify={"space-between"}>
            <div className="flex flex-col">
              <Popover>
                <PopoverTrigger>
                  <div className="flex flex-row gap-1 items-center">
                    <Text>
                      {"Metric formula"}
                    </Text>
                    <LuInfo size={18} />
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <FormulaTips />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-row gap-3 items-center w-full">
                <Input
                  labelPlacement="outside"
                  placeholder="Enter your formula here: {val}"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  variant="bordered"
                  fullWidth
                />
                {formula !== dataset.formula && (
                  <Tooltip
                    content={"Apply the formula"}
                  >
                    <Link onClick={_onApplyFormula}>
                      <LuCheckCircle className={"text-success"} />
                    </Link>
                  </Tooltip>
                )}
                <Tooltip content="Remove formula">
                  <Link onClick={_onRemoveFormula}>
                    <LuXCircle className="text-danger" />
                  </Link>
                </Tooltip>
                <Tooltip content="Click for an example">
                  <Link onClick={_onExampleFormula}>
                    <LuWand2 className="text-primary" />
                  </Link>
                </Tooltip>
              </div>
            </div>
          </Row>
        )}

        <Spacer y={4} />
        <Divider />
        <Spacer y={4} />

        <DatasetFilters
          onUpdate={_onUpdateDataset}
          fieldOptions={fieldOptions}
          dataset={dataset}
        />
      </div>

      <div className="col-span-12 md:col-span-8">
        <ChartPreview
          chart={chart}
          onRefreshPreview={() => _onRefreshPreview()}
          onChange={(data) => _onUpdateChart(data)}
        />
      </div>
    </div>
  );
}

DatasetBuilder.propTypes = {
  chart: PropTypes.object.isRequired,
  projectId: PropTypes.number.isRequired,
};

export default DatasetBuilder