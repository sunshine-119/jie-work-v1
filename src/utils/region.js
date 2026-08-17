import { useCascaderAreaData, areaList } from '@vant/area-data';

/**
 * 获取 nut-cascader 所需的省市区树形数据
 */
export function getAreaOptions() {
  return useCascaderAreaData();
}

function findCode(list, text) {
  if (!text) return '';
  for (const [code, name] of Object.entries(list)) {
    if (name === text) return code;
  }
  return '';
}

function findChildCode(list, text, parentPrefix) {
  if (!text) return '';
  const candidates = [];
  for (const [code, name] of Object.entries(list)) {
    if (name === text) candidates.push(code);
  }
  if (candidates.length === 0) return '';
  if (parentPrefix) {
    const match = candidates.find((code) => code.startsWith(parentPrefix));
    if (match) return match;
  }
  return candidates[0];
}

/**
 * 将省市区代码数组转换为文字，空格连接
 * @param {string[]} codeArray
 * @returns {string}
 */
export function codeToText(codeArray) {
  if (!Array.isArray(codeArray)) return '';
  const texts = codeArray.map((code) => {
    const key = String(code);
    return areaList.province_list[key] || areaList.city_list[key] || areaList.county_list[key] || '';
  });
  return texts.filter(Boolean).join(' ');
}

/**
 * 将省市区文字数组转换为代码数组，查不到时用空字符串兜底
 * @param {string[]} textArray
 * @returns {string[]}
 */
export function textToCode(textArray) {
  if (!Array.isArray(textArray) || textArray.length !== 3) return ['', '', ''];
  const [provinceText, cityText, districtText] = textArray;
  const provinceCode = findCode(areaList.province_list, provinceText);
  const provincePrefix = provinceCode ? provinceCode.slice(0, 2) : '';
  const cityCode = findChildCode(areaList.city_list, cityText, provincePrefix);
  const cityPrefix = cityCode ? cityCode.slice(0, 4) : '';
  const districtCode = findChildCode(areaList.county_list, districtText, cityPrefix);
  return [provinceCode, cityCode, districtCode];
}
