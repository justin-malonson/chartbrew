import React, { useState, useEffect, Fragment } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  Link as LinkNext, Spacer, Tooltip, Input, Button,
  Switch, Modal, Divider, Chip, CircularProgress, ModalHeader, ModalBody, ModalFooter,
} from "@nextui-org/react";
import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import _ from "lodash";
import { useWindowSize } from "react-use";
import {
  LuArrowLeftRight, LuArrowRight, LuCheck, LuChevronLeftCircle, LuChevronRightCircle,
  LuGraduationCap, LuPencilLine, LuPlus, LuXCircle,
} from "react-icons/lu";

import ChartPreview from "./components/ChartPreview";
import ChartSettings from "./components/ChartSettings";
import Dataset from "./components/Dataset";
import ChartDescription from "./components/ChartDescription";
import Walkthrough from "./components/Walkthrough";
import {
  createChart as createChartAction,
  updateChart as updateChartAction,
  runQuery as runQueryAction,
  runQueryWithFilters as runQueryWithFiltersAction,
} from "../../actions/chart";
import {
  getChartDatasets as getChartDatasetsAction,
  saveNewDataset as saveNewDatasetAction,
  updateDataset as updateDatasetAction,
  deleteDataset as deleteDatasetAction,
  clearDatasets as clearDatasetsAction,
} from "../../actions/dataset";
import {
  getChartAlerts as getChartAlertsAction,
  clearAlerts as clearAlertsAction,
} from "../../actions/alert";
import { updateUser as updateUserAction } from "../../actions/user";
import {
  getTemplates as getTemplatesAction
} from "../../actions/template";
import { chartColors } from "../../config/colors";
import {
  changeTutorial as changeTutorialAction,
  completeTutorial as completeTutorialAction,
  resetTutorial as resetTutorialAction,
} from "../../actions/tutorial";
import Row from "../../components/Row";
import Text from "../../components/Text";
import useThemeDetector from "../../modules/useThemeDetector";
import { useNavigate, useParams } from "react-router";

/*
  Container used for setting up a new chart
*/
function AddChart(props) {
  const [activeDataset, setActiveDataset] = useState({});
  const [titleScreen, setTitleScreen] = useState(true);
  const [newChart, setNewChart] = useState({
    type: "line",
    subType: "lcTimeseries",
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingDataset, setAddingDataset] = useState(false);
  const [savingDataset, setSavingDataset] = useState(false);
  const [chartName, setChartName] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [saveRequired, setSaveRequired] = useState(true);
  const [loading, setLoading] = useState(false);
  const [startTutorial, setStartTutorial] = useState(false);
  const [resetingTutorial, setResetingTutorial] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [updatingDataset, setUpdatingDataset] = useState(false);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [datasetsOrder, setDatasetsOrder] = useState([]);
  const [arrangementLoading, setArrangementLoading] = useState(false);
  const [invalidateCache, setInvalidateCache] = useState(false);

  const { height } = useWindowSize();

  const {
    createChart, charts, saveNewDataset, getChartDatasets, tutorial,
    datasets, updateDataset, deleteDataset, updateChart, runQuery, user, changeTutorial,
    completeTutorial, clearDatasets, resetTutorial, connections, templates, getTemplates,
    runQueryWithFilters, getChartAlerts, clearAlerts,
  } = props;

  const isDark = useThemeDetector();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    clearDatasets();
    clearAlerts();

    if (params.chartId) {
      charts.map((chart) => {
        if (chart.id === parseInt(params.chartId, 10)) {
          setNewChart(chart);
        }
        return chart;
      });
      setTitleScreen(false);

      // also fetch the chart's datasets and alerts
      getChartDatasets(params.projectId, params.chartId);
      getChartAlerts(params.projectId, params.chartId);
    }

    if (user && (!user.tutorials || Object.keys(user.tutorials).length === 0)) {
      setTimeout(() => {
        setStartTutorial(true);
      }, 1000);
    }

    getTemplates(params.teamId);
  }, []);

  useEffect(() => {
    charts.map((chart) => {
      if (chart.id === parseInt(params.chartId, 10)) {
        if (!_.isEqual(chart, newChart)) {
          setNewChart(chart);
          setChartName(chart.name);
        }
      }
      return chart;
    });
  }, [charts]);

  useEffect(() => {
    let found = false;
    charts.map((chart) => {
      if (chart.id === parseInt(params.chartId, 10)) {
        if (!_.isEqual(chart, newChart)) {
          setSaveRequired(true);
          found = true;
        }
      }
      return chart;
    });
    if (!found) setSaveRequired(false);
  }, [newChart]);

  useEffect(() => {
    if (datasets.length > 0) {
      const dOrder = [];
      datasets.forEach((d) => dOrder.push(d));
      setDatasetsOrder(dOrder);
    }
  }, [datasets]);

  const _onDatasetChanged = (dataset) => {
    setActiveDataset(dataset);
    setTimeout(() => {
      _changeTour("dataset");
    }, 1000);
  };

  const _onNameChange = (value) => {
    setChartName(value);
  };

  const _onSubmitNewName = () => {
    setEditingTitle(false);
    _onChangeChart({ name: chartName });
  };

  const _onCreateClicked = () => {
    const tempChart = { ...newChart, name: chartName };
    return createChart(params.projectId, tempChart)
      .then((createdChart) => {
        setNewChart(createdChart);
        setTitleScreen(false);
        navigate(`chart/${createdChart.id}/edit`);
        return true;
      })
      .catch(() => {
        return false;
      });
  };

  const _onSaveNewDataset = () => {
    if (savingDataset || addingDataset) return;
    setSavingDataset(true);
    let savedDataset;
    saveNewDataset(params.projectId, params.chartId, {
      chart_id: params.chartId,
      legend: `Dataset #${datasets.length + 1}`,
      datasetColor: chartColors[Math.floor(Math.random() * chartColors.length)],
      fillColor: ["rgba(0,0,0,0)"],
    })
      .then((dataset) => {
        setSavingDataset(false);
        setAddingDataset(false);
        _onDatasetChanged(dataset);
        savedDataset = dataset;
        return getChartDatasets(params.projectId, params.chartId);
      })
      .then(() => {
        _onDatasetChanged(savedDataset);
      })
      .catch(() => {
        setSavingDataset(false);
      });
  };

  const _onUpdateDataset = (newDataset, skipParsing) => {
    setUpdatingDataset(true);
    return updateDataset(
      params.projectId,
      params.chartId,
      activeDataset.id,
      newDataset
    )
      .then(async (dataset) => {
        // determine wether to do a full refresh or not
        if (activeDataset.xAxis !== dataset.xAxis
          || activeDataset.yAxis !== dataset.yAxis
          || activeDataset.yAxisOperation !== dataset.yAxisOperation
          || activeDataset.dateField !== dataset.dateField
          || activeDataset.groups !== dataset.groups
        ) {
          _onRefreshData(false, true);
        } else {
          _onRefreshPreview(skipParsing);
        }

        setActiveDataset(dataset);
        setUpdatingDataset(false);
      })
      .catch(() => {
        setUpdatingDataset(false);
        toast.error("Cannot update the dataset 😫 Please try again", {
          autoClose: 2500,
        });
      });
  };

  const _onDeleteDataset = () => {
    return deleteDataset(params.projectId, params.chartId, activeDataset.id)
      .then(() => {
        setActiveDataset({});
      })
      .catch(() => {
        toast.error("Cannot delete the dataset 😫 Please try again", {
          autoClose: 2500,
        });
      });
  };

  const _onChangeGlobalSettings = ({
    pointRadius, displayLegend, dateRange, includeZeros, timeInterval, currentEndDate,
    fixedStartDate, maxValue, minValue, xLabelTicks, stacked, horizontal, dataLabels,
    dateVarsFormat,
  }) => {
    const tempChart = {
      pointRadius: typeof pointRadius !== "undefined" ? pointRadius : newChart.pointRadius,
      displayLegend: typeof displayLegend !== "undefined" ? displayLegend : newChart.displayLegend,
      startDate: dateRange?.startDate || dateRange?.startDate === null
        ? dateRange.startDate : newChart.startDate,
      endDate: dateRange?.endDate || dateRange?.endDate === null
        ? dateRange.endDate : newChart.endDate,
      timeInterval: timeInterval || newChart.timeInterval,
      includeZeros: typeof includeZeros !== "undefined" ? includeZeros : newChart.includeZeros,
      currentEndDate: typeof currentEndDate !== "undefined" ? currentEndDate : newChart.currentEndDate,
      fixedStartDate: typeof fixedStartDate !== "undefined" ? fixedStartDate : newChart.fixedStartDate,
      minValue: typeof minValue !== "undefined" ? minValue : newChart.minValue,
      maxValue: typeof maxValue !== "undefined" ? maxValue : newChart.maxValue,
      xLabelTicks: typeof xLabelTicks !== "undefined" ? xLabelTicks : newChart.xLabelTicks,
      stacked: typeof stacked !== "undefined" ? stacked : newChart.stacked,
      horizontal: typeof horizontal !== "undefined" ? horizontal : newChart.horizontal,
      dataLabels: typeof dataLabels !== "undefined" ? dataLabels : newChart.dataLabels,
      dateVarsFormat: dateVarsFormat !== "undefined" ? dateVarsFormat : newChart.dateVarsFormat,
    };

    let skipParsing = false;
    if (pointRadius
      || displayLegend
      || minValue
      || maxValue
      || xLabelTicks
      || stacked
      || horizontal
    ) {
      skipParsing = true;
    }

    _onChangeChart(tempChart, skipParsing);
  };

  const _onChangeChart = (data, skipParsing) => {
    let shouldSkipParsing = skipParsing;
    setNewChart({ ...newChart, ...data });
    setLoading(true);
    return updateChart(params.projectId, params.chartId, data)
      .then((newData) => {
        if (!toastOpen) {
          toast.success("Updated the chart 📈", {
            onClose: () => setToastOpen(false),
            onOpen: () => setToastOpen(true),
          });
        }

        if (skipParsing || data.datasetColor || data.fillColor || data.type) {
          shouldSkipParsing = true;
        }

        // run the preview refresh only when it's needed
        if (!data.name) {
          if (data.subType || data.type) {
            _onRefreshData();
          } else {
            _onRefreshPreview(shouldSkipParsing);
          }
        }

        setLoading(false);
        return Promise.resolve(newData);
      })
      .catch((e) => {
        toast.error("Oups! Can't save the chart. Please try again.");
        setLoading(false);
        return Promise.reject(e);
      });
  };

  const _onRefreshData = (skipParsing, skipConfCheck = false) => {
    if (!params.chartId) return;

    const getCache = !invalidateCache;

    if (!skipConfCheck) {
      // check if all datasets are configured properly
      const datasetsNotConfigured = datasets.filter((dataset) => {
        if (!dataset.xAxis || !dataset.yAxis) return true;

        return false;
      });

      if (datasetsNotConfigured.length > 0) {
        datasetsNotConfigured.forEach((dataset) => {
          toast.error(`Dataset "${dataset.legend}" is not configured properly. Please check the settings.`, {
            autoClose: 3000,
          });
        });
        return;
      }
    }

    runQuery(params.projectId, params.chartId, false, false, getCache)
      .then(() => {
        if (conditions.length > 0) {
          return runQueryWithFilters(params.projectId, newChart.id, conditions);
        }

        return true;
      })
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        toast.error("We couldn't fetch the data. Please check your dataset settings and try again", {
          autoClose: 2500,
        });
        setLoading(false);
      });
  };

  const _onRefreshPreview = (skipParsing = true) => {
    if (!params.chartId) return;
    runQuery(params.projectId, params.chartId, true, skipParsing, true)
      .then(() => {
        if (conditions.length > 0) {
          return runQueryWithFilters(params.projectId, newChart.id, conditions);
        }

        return true;
      })
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const _changeTour = (tut) => {
    changeTutorial(tut);
  };

  const _onCloseTour = () => {
    completeTutorial();
  };

  const _onCancelWalkthrough = () => {
    setStartTutorial(false);
    // complete all AddChart-related tutorials
    // TODO: find a better way of doing this
    return completeTutorial("addchart")
      .then(() => completeTutorial("dataset"))
      .then(() => completeTutorial("apibuilder"))
      .then(() => completeTutorial("mongobuilder"))
      .then(() => completeTutorial("sqlbuilder"))
      .then(() => completeTutorial("requestmodal"))
      .then(() => completeTutorial("datasetdata"))
      .then(() => completeTutorial("drsettings"));
  };

  const _onResetTutorial = () => {
    setResetingTutorial(true);
    return resetTutorial([
      "addchart",
      "dataset",
      "apibuilder",
      "mongobuilder",
      "sqlbuilder",
      "requestmodal",
      "datasetdata",
      "drsettings"
    ])
      .then(() => {
        changeTutorial("addchart");
        setResetingTutorial(false);
      })
      .catch(() => setResetingTutorial(false));
  };

  const _onAddFilter = (condition) => {
    let found = false;
    const newConditions = conditions.map((c) => {
      let newCondition = c;
      if (c.id === condition.id) {
        newCondition = condition;
        found = true;
      }
      return newCondition;
    });
    if (!found) newConditions.push(condition);
    setConditions(newConditions);

    runQueryWithFilters(params.projectId, newChart.id, [condition]);
  };

  const _onClearFilter = (condition) => {
    const newConditions = [...conditions];
    const clearIndex = _.findIndex(conditions, { id: condition.id });
    if (clearIndex > -1) newConditions.splice(clearIndex, 1);

    setConditions(newConditions);
    runQueryWithFilters(params.projectId, newChart.id, [condition]);
  };

  const _onSaveArrangement = () => {
    const promiseData = [];
    setArrangementLoading(true);

    datasetsOrder.forEach((d, index) => {
      promiseData.push(
        updateDataset(
          params.projectId,
          params.chartId,
          d.id,
          { order: index },
        ),
      );
    });

    Promise.all(promiseData)
      .then(() => {
        setArrangementLoading(false);
        setArrangeMode(false);
        _onRefreshData(true);
        getChartDatasets(params.projectId, params.chartId);
      })
      .catch(() => {
        toast.error("Oups! Can't save the arrangement. Please try again.");
        setArrangeMode(false);
        setArrangementLoading(false);
      });
  };

  const _changeDatasetOrder = (dId, direction) => {
    const newDatasetsOrder = [...datasetsOrder];
    const index = _.findIndex(datasetsOrder, { id: dId });
    if (direction === "up") {
      if (index === 0) return;
      newDatasetsOrder[index] = datasetsOrder[index - 1];
      newDatasetsOrder[index - 1] = datasetsOrder[index];
    } else {
      if (index === datasetsOrder.length - 1) return;
      newDatasetsOrder[index] = datasetsOrder[index + 1];
      newDatasetsOrder[index + 1] = datasetsOrder[index];
    }

    setDatasetsOrder(newDatasetsOrder);
  };

  if (titleScreen) {
    return (
      <div style={{ textAlign: "center" }}>
        <ChartDescription
          name={chartName}
          onChange={_onNameChange}
          onCreate={_onCreateClicked}
          teamId={params.teamId}
          projectId={params.projectId}
          connections={connections}
          templates={templates}
          noConnections={connections.length === 0}
        />
        <Spacer y={2} />
      </div>
    );
  }

  return (
    <div style={styles.container(height)} className="md:pl-4 md:pr-4">
      <ToastContainer
        position="bottom-right"
        autoClose={1500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnVisibilityChange
        draggable
        pauseOnHover
        transition={Flip}
        theme={isDark ? "dark" : "light"}
      />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <Row align="center" wrap="wrap" justify="space-between">
            <Row className="chart-name-tut">
              {!editingTitle
                && (
                  <Tooltip content="Edit the chart name">
                    <LinkNext onPress={() => setEditingTitle(true)} className="flex items-center" color="primary">
                      <LuPencilLine />
                      <Spacer x={0.5} />
                      <Text b>
                        {newChart.name}
                      </Text>
                    </LinkNext>
                  </Tooltip>
                )}

              {editingTitle && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  _onSubmitNewName();
                }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Input
                      placeholder="Enter a title"
                      value={chartName}
                      onChange={(e) => _onNameChange(e.target.value)}
                      variant="bordered"
                      size="sm"
                    />
                    <Spacer x={0.5} />
                    <Button
                      color="secondary"
                      type="submit"
                      onClick={_onSubmitNewName}
                      size="sm"
                    >
                      Save
                    </Button>
                  </div>
                </form>
              )}
            </Row>
            <Row className="chart-actions-tut" align="center" justify="flex-end">
              <div style={{ display: "flex" }}>
                <Switch
                  isSelected={newChart.draft}
                  onChange={() => _onChangeChart({ draft: !newChart.draft })}
                  size="sm"
                />
                <Spacer x={0.5} />
                <Text>Draft</Text>
              </div>
              <Spacer x={4} />
              <Button
                color={saveRequired ? "primary" : "success"}
                onClick={() => _onChangeChart({})}
                isLoading={loading}
                size="sm"
                variant={saveRequired ? "solid" : "flat"}
              >
                {saveRequired && "Save chart"}
                {!saveRequired && "Chart saved"}
              </Button>
            </Row>
          </Row>
          <Spacer y={2} />
          <Row className="chart-type-tut">
            <ChartPreview
              chart={newChart}
              onChange={_onChangeChart}
              onRefreshData={_onRefreshData}
              onRefreshPreview={_onRefreshPreview}
              onAddFilter={_onAddFilter}
              onClearFilter={_onClearFilter}
              conditions={conditions}
              datasets={datasets}
              invalidateCache={invalidateCache}
              changeCache={() => setInvalidateCache(!invalidateCache)}
            />
          </Row>
          <Spacer y={4} />
          <Row>
            {params.chartId && newChart.type && datasets.length > 0 && (
              <ChartSettings
                type={newChart.type}
                pointRadius={newChart.pointRadius}
                startDate={newChart.startDate}
                endDate={newChart.endDate}
                displayLegend={newChart.displayLegend}
                includeZeros={newChart.includeZeros}
                currentEndDate={newChart.currentEndDate}
                fixedStartDate={newChart.fixedStartDate}
                timeInterval={newChart.timeInterval}
                onChange={_onChangeGlobalSettings}
                onComplete={(skipParsing = false) => _onRefreshPreview(skipParsing)}
                maxValue={newChart.maxValue}
                minValue={newChart.minValue}
                xLabelTicks={newChart.xLabelTicks}
                stacked={newChart.stacked}
                horizontal={newChart.horizontal}
                dateVarsFormat={newChart.dateVarsFormat}
                dataLabels={newChart.dataLabels}
              />
            )}
          </Row>
        </div>

        <div className="col-span-12 md:col-span-6 add-dataset-tut">
          <div className={"bg-content1 rounded-lg mx-auto p-4 w-full"}>
            <Row justify="space-between">
              <Text b>
                Datasets
              </Text>
              <Tooltip content="Start the chart builder tutorial" placement="leftStart">
                <LinkNext className="text-default-600 flex items-center" onPress={_onResetTutorial}>
                  {!resetingTutorial ? <LuGraduationCap /> : <CircularProgress  />}
                  <Spacer x={0.5} />
                  <Text>Tutorial</Text>
                </LinkNext>
              </Tooltip>
            </Row>
            <Spacer y={1} />
            <Divider />
            <Spacer y={4} />
            <Row wrap="wrap">
              {!arrangeMode && datasets && datasets.map((dataset) => {
                return (
                  <Fragment key={dataset.id}>
                    <Button
                      style={styles.datasetButtons}
                      onClick={() => _onDatasetChanged(dataset)}
                      variant={dataset.id !== activeDataset.id ? "ghost" : "solid"}
                      size="sm"
                      auto
                    >
                      {dataset.legend}
                    </Button>
                  </Fragment>
                );
              })}
              {arrangeMode && datasets && datasetsOrder.map((dataset, index) => {
                return (
                  <>
                    <Chip
                      style={styles.datasetButtons}
                      key={dataset.id}
                      radius="sm"
                      variant={"bordered"}
                      color="primary"
                      startContent={index > 0 ? (
                        <LinkNext onPress={() => _changeDatasetOrder(dataset.id, "up")}>
                          <LuChevronLeftCircle size={16} />
                        </LinkNext>
                      ) : null}
                      endContent={index < datasetsOrder.length - 1 ? (
                        <LinkNext onPress={() => _changeDatasetOrder(dataset.id, "down")}>
                          <LuChevronRightCircle size={16} />
                        </LinkNext>
                      ) : null}
                    >
                      {dataset.legend}
                    </Chip>
                  </>
                );
              })}
            </Row>

            <Row align="center" justify="space-between">
              {!addingDataset && datasets.length > 0 && (
                <>
                  <div>
                    <Button
                      onClick={() => _onSaveNewDataset()}
                      startContent={<LuPlus />}
                      color="primary"
                      variant="light"
                    >
                      {"Add new dataset"}
                    </Button>
                  </div>
                  <div style={{ display: "flex", "flexDirection": "row", justifyContent: "flex-end" }}>
                    <Button
                      onClick={() => {
                        if (!arrangeMode) setArrangeMode(true);
                        else _onSaveArrangement();
                      }}
                      startContent={arrangeMode ? <LuCheck /> : <LuArrowLeftRight />}
                      auto
                      color={arrangeMode ? "success" : "primary"}
                      variant="light"
                      isLoading={arrangementLoading}
                    >
                      {!arrangeMode && "Arrange datasets"}
                      {arrangeMode && "Save"}
                    </Button>
                    {arrangeMode && (
                      <>
                        <Tooltip content="Cancel arrangement" placement="left-start">
                          <Button
                            onClick={() => setArrangeMode(false)}
                            isIconOnly
                            variant="light"
                            color="warning"
                            auto
                          >
                            <LuXCircle />
                          </Button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </>
              )}

              {!addingDataset && datasets.length === 0 && (
                <Button
                  size="lg"
                  onClick={() => _onSaveNewDataset()}
                  isLoading={savingDataset}
                  endContent={<LuPlus />}
                  color="primary"
                >
                  {"Add the first dataset"}
                </Button>
              )}
            </Row>

            <Spacer y={2} />
            <div>
              {activeDataset.id && datasets.map((dataset) => {
                return (
                  <div style={activeDataset.id !== dataset.id ? { display: "none" } : {}} key={dataset.id}>
                    <Dataset
                      dataset={dataset}
                      onUpdate={(data, skipParsing = false) => _onUpdateDataset(data, skipParsing)}
                      onDelete={_onDeleteDataset}
                      chart={newChart}
                      onRefresh={_onRefreshData}
                      onRefreshPreview={_onRefreshPreview}
                      loading={updatingDataset}
                    />
                  </div>
                );
              })}
              {!activeDataset.id && (
                <Text className={"text-default-600"} h3>
                  {"Select or create a dataset above"}
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>

      <Walkthrough
        tourActive={tutorial}
        closeTour={_onCloseTour}
        userTutorials={user.tutorials}
      />

      <Modal isOpen={startTutorial} onClose={() => setStartTutorial(false)}>
        <ModalHeader>
          <Text size="h3">
            Welcome to the chart builder!
          </Text>
        </ModalHeader>
        <ModalBody>
          <Text b>{"This is the place where your charts will take shape."}</Text>
          <Spacer y={1} />
          <Text>
            {"It is recommended that you read through the next steps to get familiar with the interface. "}
            {"You can always restart the tutorial from the upper right corner at any later time."}
          </Text>
          <Spacer y={1} />
          <Text>{"But without further ado, let's get started"}</Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={_onCancelWalkthrough} variant="flat" color="warning">
            Cancel walkthrough
          </Button>
          <Button
            color="success"
            onClick={() => {
              setStartTutorial(false);
              _changeTour("addchart");
            }}
            endContent={<LuArrowRight />}
          >
            Get started
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

const styles = {
  container: (height) => ({
    flex: 1,
    paddingTop: 20,
    paddingBottom: 20,
    minHeight: height,
  }),
  mainContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  mainSegment: {
    minHeight: 600,
  },
  topBuffer: {
    marginTop: 20,
  },
  addDataset: {
    marginTop: 10,
  },
  datasetButtons: {
    marginBottom: 10,
    marginRight: 3,
  },
  editTitle: {
    cursor: "pointer",
  },
  tutorialBtn: {
    boxShadow: "none",
    marginTop: -10,
  },
};

AddChart.propTypes = {
  createChart: PropTypes.func.isRequired,
  charts: PropTypes.array.isRequired,
  getChartDatasets: PropTypes.func.isRequired,
  saveNewDataset: PropTypes.func.isRequired,
  updateDataset: PropTypes.func.isRequired,
  deleteDataset: PropTypes.func.isRequired,
  datasets: PropTypes.array.isRequired,
  updateChart: PropTypes.func.isRequired,
  runQuery: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  tutorial: PropTypes.string.isRequired,
  changeTutorial: PropTypes.func.isRequired,
  completeTutorial: PropTypes.func.isRequired,
  resetTutorial: PropTypes.func.isRequired,
  clearDatasets: PropTypes.func.isRequired,
  connections: PropTypes.array.isRequired,
  getTemplates: PropTypes.func.isRequired,
  templates: PropTypes.object.isRequired,
  runQueryWithFilters: PropTypes.func.isRequired,
  getChartAlerts: PropTypes.func.isRequired,
  clearAlerts: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => {
  return {
    charts: state.chart.data,
    datasets: state.dataset.data,
    user: state.user.data,
    tutorial: state.tutorial,
    connections: state.connection.data,
    templates: state.template,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    createChart: (projectId, data) => dispatch(createChartAction(projectId, data)),
    getChartDatasets: (projectId, chartId) => {
      return dispatch(getChartDatasetsAction(projectId, chartId));
    },
    saveNewDataset: (projectId, chartId, data) => {
      return dispatch(saveNewDatasetAction(projectId, chartId, data));
    },
    updateDataset: (projectId, chartId, datasetId, data) => {
      return dispatch(updateDatasetAction(projectId, chartId, datasetId, data));
    },
    deleteDataset: (projectId, chartId, datasetId) => {
      return dispatch(deleteDatasetAction(projectId, chartId, datasetId));
    },
    updateChart: (projectId, chartId, data) => {
      return dispatch(updateChartAction(projectId, chartId, data));
    },
    runQuery: (projectId, chartId, noSource, skipParsing, getCache) => {
      return dispatch(runQueryAction(projectId, chartId, noSource, skipParsing, getCache));
    },
    updateUser: (id, data) => dispatch(updateUserAction(id, data)),
    changeTutorial: (tut) => dispatch(changeTutorialAction(tut)),
    completeTutorial: (tut) => dispatch(completeTutorialAction(tut)),
    resetTutorial: (tut) => dispatch(resetTutorialAction(tut)),
    clearDatasets: () => dispatch(clearDatasetsAction()),
    getTemplates: (teamId) => dispatch(getTemplatesAction(teamId)),
    runQueryWithFilters: (projectId, chartId, filters) => (
      dispatch(runQueryWithFiltersAction(projectId, chartId, filters))
    ),
    getChartAlerts: (projectId, chartId) => dispatch(getChartAlertsAction(projectId, chartId)),
    clearAlerts: () => dispatch(clearAlertsAction()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddChart);
