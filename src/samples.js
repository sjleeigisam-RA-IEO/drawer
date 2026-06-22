import { MODEL_VERSION } from "./schema.js";

export const samples = [
  {
    id: "office-typical",
    name: "오피스 기준층",
    model: {
      version: MODEL_VERSION,
      id: "office-typical",
      name: "Office Typical Floor Review",
      buildingType: "office",
      units: "m",
      plan: {
        width: 48,
        depth: 34,
        perimeterWallThickness: 0.28,
        columnSize: 0.7,
        gridX: [-20, -10, 0, 10, 20],
        gridZ: [-12, 0, 12],
        core: { x: -8, z: 0, width: 10, depth: 12 },
        facadeModule: 3
      },
      levels: [
        {
          id: "lobby",
          name: "1F",
          use: "retail",
          count: 1,
          floorToFloorHeight: 5.2,
          slabDepth: 0.35,
          beamDepth: 0.55,
          ceilingVoid: 0.65,
          finishedCeilingHeight: 3.8,
          clearHeight: 4.1
        },
        {
          id: "officeTypical",
          name: "기준층",
          use: "office",
          count: 9,
          floorToFloorHeight: 4.1,
          slabDepth: 0.32,
          beamDepth: 0.5,
          ceilingVoid: 0.78,
          finishedCeilingHeight: 2.9,
          clearHeight: 3.1
        }
      ],
      scenarios: [
        { id: "base", name: "현재안", overrides: {} },
        {
          id: "raised-ceiling",
          name: "천정고 개선안",
          overrides: {
            levels: {
              officeTypical: {
                finishedCeilingHeight: 3.1,
                ceilingVoid: 0.58
              }
            }
          }
        }
      ]
    }
  },
  {
    id: "logistics-core",
    name: "물류센터 단면",
    model: {
      version: MODEL_VERSION,
      id: "logistics-core",
      name: "Logistics Clear Height Review",
      buildingType: "logistics",
      units: "m",
      plan: {
        width: 96,
        depth: 62,
        perimeterWallThickness: 0.35,
        columnSize: 0.85,
        gridX: [-42, -28, -14, 0, 14, 28, 42],
        gridZ: [-24, -12, 0, 12, 24],
        dockDoors: 12,
        rackRows: 6
      },
      levels: [
        {
          id: "warehouse1",
          name: "창고층",
          use: "logistics",
          count: 1,
          floorToFloorHeight: 13.5,
          slabDepth: 0.4,
          beamDepth: 1.1,
          ceilingVoid: 0,
          finishedCeilingHeight: 0,
          clearHeight: 11.8,
          dockHeight: 1.2
        },
        {
          id: "officeAnnex",
          name: "부속사무",
          use: "office",
          count: 2,
          floorToFloorHeight: 3.9,
          slabDepth: 0.28,
          beamDepth: 0.45,
          ceilingVoid: 0.55,
          finishedCeilingHeight: 2.8,
          clearHeight: 3.0
        }
      ],
      scenarios: [
        { id: "base", name: "현재안", overrides: {} },
        {
          id: "rack-clearance",
          name: "랙 적재 개선안",
          overrides: {
            levels: {
              warehouse1: {
                clearHeight: 12.4,
                beamDepth: 0.8
              }
            }
          }
        }
      ]
    }
  },
  {
    id: "daechi2-pdf-sample",
    name: "대치2빌딩 PDF 샘플",
    model: {
      version: MODEL_VERSION,
      id: "daechi2-pdf-sample",
      name: "Daechi 2 Building PDF Sampling Model",
      buildingType: "office",
      units: "m",
      source: {
        kind: "pdf",
        fileName: "도면(B1F~19F)_평면도.pdf",
        sourceVectorPackageId: "daechi2-pdf-vector",
        pageCount: 20,
        pageRefs: [
          { pageIndex: 1, title: "B1F", levelIds: ["b1"] },
          { pageIndex: 2, title: "1F", levelIds: ["lobby"] },
          { pageIndex: 3, title: "2F", levelIds: ["secondFloor"] },
          { pageIndex: 4, title: "3F", levelIds: ["officeTypical"], repeatsThrough: "19F" }
        ],
        extractedFloorTitles: [
          "B1F",
          "1F",
          "2F",
          "3F",
          "4F",
          "5F",
          "6F",
          "7F",
          "8F",
          "9F",
          "10F",
          "11F",
          "12F",
          "13F",
          "14F",
          "15F",
          "16F",
          "17F",
          "18F",
          "19F"
        ],
        samplingNote: "PDF title text and visible plan dimensions were used; geometry is a review draft."
      },
      plan: {
        width: 31.2,
        depth: 35.9,
        perimeterWallThickness: 0.28,
        columnSize: 0.62,
        showFurniture: false,
        showFootprintGuide: true,
        camera: { xSign: -1, zSign: -1 },
        outline: [
          [-11.8, -17.95],
          [15.6, -17.95],
          [15.6, 17.95],
          [-15.6, 17.95],
          [-15.6, -12.9]
        ],
        features: [
          {
            name: "south-driveway-band",
            levelIds: ["lobby"],
            material: "dock",
            x: 2.8,
            y: 0.08,
            z: -15.8,
            width: 23.5,
            height: 0.16,
            depth: 1.4
          },
          {
            name: "east-ramp-band",
            levelIds: ["lobby"],
            material: "dock",
            x: 13.8,
            y: 0.14,
            z: -8.5,
            width: 1.3,
            height: 0.2,
            depth: 12.5
          },
          {
            name: "west-service-core",
            levelIds: ["lobby", "secondFloor", "officeTypical"],
            material: "core",
            x: -9.2,
            y: 1.45,
            z: -1.4,
            width: 4.8,
            height: 2.9,
            depth: 13.8
          }
        ],
        gridX: [-15.6, -8.1, 0, 8.1, 15.6],
        gridZ: [-17.95, -8.9, 0, 8.9, 17.95],
        core: { x: -5.6, z: -1.5, width: 10.8, depth: 15.6, elevators: 3, stairs: 2, risers: 3 },
        facadeModule: 3
      },
      levels: [
        {
          id: "b1",
          name: "B1F",
          use: "parking",
          count: 1,
          floorToFloorHeight: 3.8,
          slabDepth: 0.32,
          beamDepth: 0.55,
          ceilingVoid: 0.45,
          finishedCeilingHeight: 2.6,
          clearHeight: 2.8
        },
        {
          id: "lobby",
          name: "1F",
          use: "retail",
          count: 1,
          floorToFloorHeight: 4.5,
          slabDepth: 0.32,
          beamDepth: 0.55,
          ceilingVoid: 0.55,
          finishedCeilingHeight: 3.4,
          clearHeight: 3.6
        },
        {
          id: "secondFloor",
          name: "2F",
          use: "office",
          count: 1,
          floorToFloorHeight: 4.0,
          slabDepth: 0.32,
          beamDepth: 0.5,
          ceilingVoid: 0.65,
          finishedCeilingHeight: 2.95,
          clearHeight: 3.15
        },
        {
          id: "officeTypical",
          name: "3F-19F",
          use: "office",
          count: 17,
          floorToFloorHeight: 3.9,
          slabDepth: 0.32,
          beamDepth: 0.5,
          ceilingVoid: 0.72,
          finishedCeilingHeight: 2.75,
          clearHeight: 2.95
        }
      ],
      scenarios: [
        { id: "base", name: "PDF 샘플 기준안", overrides: {} },
        {
          id: "ceiling-review",
          name: "업무층 천정고 검토안",
          overrides: {
            levels: {
              officeTypical: {
                finishedCeilingHeight: 2.95,
                ceilingVoid: 0.52
              }
            }
          }
        }
      ]
    }
  },
  {
    id: "hobup-gangnam-logistics-sample",
    name: "이천호법 강남물류 샘플",
    model: {
      version: MODEL_VERSION,
      id: "hobup-gangnam-logistics-sample",
      name: "Icheon Hobup Gangnam Logistics Review",
      buildingType: "logistics",
      units: "m",
      source: {
        kind: "pdf-set",
        fileName: "이천호법 물류센터 / 강남물류",
        sourceVectorPackageId: "hobup-gangnam-vector",
        pageCount: 22,
        pageRefs: [
          { pageIndex: 1, title: "지하2층평면도", levelIds: ["b2"] },
          { pageIndex: 2, title: "지하1층평면도", levelIds: ["b1"] },
          { pageIndex: 3, title: "PIT평면도", levelIds: ["pit"] },
          { pageIndex: 4, title: "1층평면도", levelIds: ["warehouse1"] },
          { pageIndex: 5, title: "2층평면도", levelIds: ["warehouseUpper"] },
          { pageIndex: 6, title: "3층평면도", levelIds: ["warehouseUpper"] },
          { pageIndex: 12, title: "주 단면도", levelIds: ["warehouse1", "warehouseUpper"] },
          { pageIndex: 20, title: "1층환기덕트 평면도", levelIds: ["warehouse1"] }
        ],
        samplingNote: "Folder/file names drive the page mapping. The model is a parametric review draft, not a certified BIM extraction."
      },
      plan: {
        width: 229.3,
        depth: 92,
        perimeterWallThickness: 0.38,
        columnSize: 0.9,
        showFurniture: false,
        showFootprintGuide: true,
        camera: { xSign: -1, zSign: -1 },
        outline: [
          [-114.65, -46],
          [114.65, -46],
          [114.65, 46],
          [-108, 46],
          [-114.65, 37]
        ],
        features: [
          {
            name: "gangnam-office-core",
            levelIds: ["warehouse1", "warehouseUpper"],
            material: "core",
            x: -84,
            y: 0.18,
            z: -23,
            width: 20,
            height: 1,
            depth: 16
          },
          {
            name: "gangnam-dock-apron",
            levelIds: ["warehouse1"],
            material: "dock",
            x: 0,
            y: 0.08,
            z: 44,
            width: 198,
            height: 0.16,
            depth: 3.5
          }
        ],
        gridX: [-103, -82.4, -61.8, -41.2, -20.6, 0, 20.6, 41.2, 61.8, 82.4, 103],
        gridZ: [-36, -18, 0, 18, 36],
        core: { x: -84, z: -23, width: 20, depth: 16, elevators: 2, stairs: 2, risers: 4 },
        dockDoors: 24,
        rackRows: 8
      },
      levels: [
        {
          id: "b2",
          name: "B2F",
          use: "parking",
          count: 1,
          floorToFloorHeight: 4.2,
          slabDepth: 0.35,
          beamDepth: 0.75,
          ceilingVoid: 0.45,
          finishedCeilingHeight: 0,
          clearHeight: 3.1
        },
        {
          id: "b1",
          name: "B1F",
          use: "logistics",
          count: 1,
          floorToFloorHeight: 4.5,
          slabDepth: 0.35,
          beamDepth: 0.8,
          ceilingVoid: 0.55,
          finishedCeilingHeight: 0,
          clearHeight: 3.4
        },
        {
          id: "pit",
          name: "PIT",
          use: "logistics",
          count: 1,
          floorToFloorHeight: 2.4,
          slabDepth: 0.28,
          beamDepth: 0.45,
          ceilingVoid: 0.25,
          finishedCeilingHeight: 0,
          clearHeight: 1.85
        },
        {
          id: "warehouse1",
          name: "1F",
          use: "logistics",
          count: 1,
          floorToFloorHeight: 8.9,
          slabDepth: 0.42,
          beamDepth: 1.1,
          ceilingVoid: 0.9,
          finishedCeilingHeight: 0,
          clearHeight: 7.15,
          dockHeight: 1.2
        },
        {
          id: "warehouseUpper",
          name: "2F-3F",
          use: "logistics",
          count: 2,
          floorToFloorHeight: 7.8,
          slabDepth: 0.4,
          beamDepth: 1,
          ceilingVoid: 0.75,
          finishedCeilingHeight: 0,
          clearHeight: 6.45
        }
      ],
      scenarios: [
        { id: "base", name: "준공도면 샘플 기준안", overrides: {} },
        {
          id: "clear-height-plus",
          name: "물류층 유효고 검토안",
          overrides: {
            levels: {
              warehouse1: { clearHeight: 7.65, beamDepth: 0.85 },
              warehouseUpper: { clearHeight: 6.9, beamDepth: 0.8 }
            }
          }
        }
      ]
    }
  },
  {
    id: "hobup-dongsan-logistics-sample",
    name: "이천호법 동산물류 샘플",
    model: {
      version: MODEL_VERSION,
      id: "hobup-dongsan-logistics-sample",
      name: "Icheon Hobup Dongsan Logistics Review",
      buildingType: "logistics",
      units: "m",
      source: {
        kind: "pdf-set",
        fileName: "이천호법 물류센터 / 동산물류",
        sourceVectorPackageId: "hobup-dongsan-vector",
        pageCount: 22,
        pageRefs: [
          { pageIndex: 1, title: "지하2층 평면도", levelIds: ["b2"] },
          { pageIndex: 2, title: "지하1층 평면도", levelIds: ["b1"] },
          { pageIndex: 3, title: "지상1층 평면도", levelIds: ["warehouse1"] },
          { pageIndex: 4, title: "지상2층 평면도", levelIds: ["warehouseUpper"] },
          { pageIndex: 5, title: "지상3층 평면도", levelIds: ["warehouseUpper"] },
          { pageIndex: 6, title: "지상4층 평면도", levelIds: ["warehouseUpper"] },
          { pageIndex: 11, title: "주단면도-3", levelIds: ["warehouse1", "warehouseUpper"] },
          { pageIndex: 18, title: "1층환기덕트 평면도", levelIds: ["warehouse1"] }
        ],
        samplingNote: "Folder/file names drive the page mapping. The model is a parametric review draft, not a certified BIM extraction."
      },
      plan: {
        width: 188,
        depth: 84,
        perimeterWallThickness: 0.38,
        columnSize: 0.88,
        showFurniture: false,
        showFootprintGuide: true,
        camera: { xSign: -1, zSign: -1 },
        outline: [
          [-94, -42],
          [94, -42],
          [94, 42],
          [-94, 42]
        ],
        features: [
          {
            name: "dongsan-office-core",
            levelIds: ["warehouse1", "warehouseUpper"],
            material: "core",
            x: -68,
            y: 0.18,
            z: -18,
            width: 18,
            height: 1,
            depth: 15
          },
          {
            name: "dongsan-dock-apron",
            levelIds: ["warehouse1"],
            material: "dock",
            x: 0,
            y: 0.08,
            z: 40,
            width: 160,
            height: 0.16,
            depth: 3.3
          }
        ],
        gridX: [-84, -63, -42, -21, 0, 21, 42, 63, 84],
        gridZ: [-32, -16, 0, 16, 32],
        core: { x: -68, z: -18, width: 18, depth: 15, elevators: 2, stairs: 2, risers: 4 },
        dockDoors: 20,
        rackRows: 7
      },
      levels: [
        {
          id: "b2",
          name: "B2F",
          use: "parking",
          count: 1,
          floorToFloorHeight: 4.2,
          slabDepth: 0.35,
          beamDepth: 0.75,
          ceilingVoid: 0.45,
          finishedCeilingHeight: 0,
          clearHeight: 3.1
        },
        {
          id: "b1",
          name: "B1F",
          use: "logistics",
          count: 1,
          floorToFloorHeight: 4.4,
          slabDepth: 0.35,
          beamDepth: 0.8,
          ceilingVoid: 0.55,
          finishedCeilingHeight: 0,
          clearHeight: 3.35
        },
        {
          id: "warehouse1",
          name: "1F",
          use: "logistics",
          count: 1,
          floorToFloorHeight: 8.5,
          slabDepth: 0.42,
          beamDepth: 1.05,
          ceilingVoid: 0.85,
          finishedCeilingHeight: 0,
          clearHeight: 6.85,
          dockHeight: 1.2
        },
        {
          id: "warehouseUpper",
          name: "2F-4F",
          use: "logistics",
          count: 3,
          floorToFloorHeight: 7.4,
          slabDepth: 0.4,
          beamDepth: 0.95,
          ceilingVoid: 0.75,
          finishedCeilingHeight: 0,
          clearHeight: 6.05
        }
      ],
      scenarios: [
        { id: "base", name: "준공도면 샘플 기준안", overrides: {} },
        {
          id: "clear-height-plus",
          name: "물류층 유효고 검토안",
          overrides: {
            levels: {
              warehouse1: { clearHeight: 7.25, beamDepth: 0.82 },
              warehouseUpper: { clearHeight: 6.45, beamDepth: 0.78 }
            }
          }
        }
      ]
    }
  }
];
